import { Injectable, Logger } from '@nestjs/common';
import { NodeIO, getBounds, type Node, type Scene } from '@gltf-transform/core';
import { prune, flatten } from '@gltf-transform/functions';
import { KHRDracoMeshCompression } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

export interface SplitResult {
  name: string;
  fileUrl: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

@Injectable()
export class ModelProcessorService {
  private readonly logger = new Logger(ModelProcessorService.name);
  private io: NodeIO | null = null;

  private async getIO(): Promise<NodeIO> {
    if (!this.io) {
      this.io = new NodeIO()
        .registerExtensions([KHRDracoMeshCompression])
        .registerDependencies({
          'draco3d.decoder': await draco3d.createDecoderModule(),
          'draco3d.encoder': await draco3d.createEncoderModule(),
        });
    }
    return this.io;
  }

  private createUniqueFileName(baseName: string, usedNames: Set<string>) {
    const sanitizedBase = (baseName || 'Node').replace(/[^a-zA-Z0-9-_]/g, '_');
    let fileName = `${sanitizedBase}.glb`;
    let index = 1;
    while (usedNames.has(fileName)) {
      fileName = `${sanitizedBase}_${index}.glb`;
      index += 1;
    }
    usedNames.add(fileName);
    return fileName;
  }

  async uploadAndPlaceGltf(
    sourceFilePath: string,
    outputDirName: string,
  ): Promise<{ rootFileUrl: string | null; children: SplitResult[] }> {
    const io = await this.getIO();
    const document = await io.read(sourceFilePath);

    // Tầng 1: Giải nén & Phẳng hóa (flatten)
    this.logger.log(`Running flatten() on document...`);
    await document.transform(flatten());
    
    const scenes = document.getRoot().listScenes();
    const scene = document.getRoot().getDefaultScene() || scenes[0];
    if (!scene) {
      throw new Error('No scene found in glTF file');
    }

    const outputDir = join(process.cwd(), 'uploads', outputDirName);
    mkdirSync(outputDir, { recursive: true });

    // LOD 0 (Root shell): Giữ lại bản sao đã flatten
    const rootFileName = `root-shell.glb`;
    const rootFilePath = join(outputDir, rootFileName);
    const flattenedBuffer = await io.writeBinary(document);
    writeFileSync(rootFilePath, Buffer.from(flattenedBuffer));
    const rootFileUrl = `/uploads/${outputDirName}/${rootFileName}`;

    let splitResults: SplitResult[] = [];
    const usedFileNames = new Set<string>();
    const childrenNodes = scene.listChildren();

    // Tầng 3: Bóc tách & Áp tọa độ
    for (let i = 0; i < childrenNodes.length; i++) {
      try {
        const childDoc = await io.readBinary(flattenedBuffer);
        
        const clonedScenes = childDoc.getRoot().listScenes();
        const clonedScene = childDoc.getRoot().getDefaultScene() || clonedScenes[0];
        const clonedChildren = clonedScene.listChildren();
        
        const targetClonedChild = clonedChildren[i];
        if (!targetClonedChild) continue;

        const childName = targetClonedChild.getName() || `Node_${i}`;
        
        for (let j = 0; j < clonedChildren.length; j++) {
          if (j !== i) {
            clonedChildren[j].detach();
          }
        }

        const box = getBounds(targetClonedChild);
        let cx = 0, cy = 0, cz = 0;
        if (box && isFinite(box.min[0]) && isFinite(box.max[0])) {
          cx = (box.min[0] + box.max[0]) / 2;
          cy = (box.min[1] + box.max[1]) / 2;
          cz = (box.min[2] + box.max[2]) / 2;
        }

        // Origin Fix: dời node về [0,0,0]
        const wrapperNode = childDoc.createNode(`${childName}_wrapper`);
        clonedScene.addChild(wrapperNode);
        
        targetClonedChild.detach();
        wrapperNode.addChild(targetClonedChild);
        wrapperNode.setTranslation([-cx, -cy, -cz]);

        await childDoc.transform(prune());

        const glbBuffer = await io.writeBinary(childDoc);
        const childFileName = this.createUniqueFileName(childName, usedFileNames);
        const childFilePath = join(outputDir, childFileName);
        
        writeFileSync(childFilePath, Buffer.from(glbBuffer));

        splitResults.push({
          name: childName,
          fileUrl: `/uploads/${outputDirName}/${childFileName}`,
          position: { x: cx, y: cy, z: cz },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        });

      } catch (err: any) {
        this.logger.error(`Error processing child at index ${i}: ${err.message}`);
      }
    }

    return { rootFileUrl, children: splitResults };
  }

  async splitGltf(
    sourceFilePath: string,
    parentId: string,
  ): Promise<{ rootFileUrl: string; children: SplitResult[] }> {
    const io = await this.getIO();
    const document = await io.read(sourceFilePath);
    
    const scenes = document.getRoot().listScenes();
    const scene = document.getRoot().getDefaultScene() || scenes[0];
    if (!scene) {
      throw new Error('No scene found in glTF file');
    }

    // Tầng 1: Draco decoder đã tự động được apply trong getIO() khi io.read()
    
    const childrenNodes = scene.listChildren();
    
    // Thư mục lưu kết quả
    const outputDirName = `scenes/${parentId}`;
    const outputDir = join(process.cwd(), 'uploads', outputDirName);
    mkdirSync(outputDir, { recursive: true });

    // Copy file gốc làm root (LOD 0) shell model
    const rootFileName = `root-shell.glb`;
    const rootFilePath = join(outputDir, rootFileName);
    const rootBuffer = await io.writeBinary(document);
    writeFileSync(rootFilePath, Buffer.from(rootBuffer));
    const rootFileUrl = `/uploads/${outputDirName}/${rootFileName}`;

    let splitResults: SplitResult[] = [];

    // Tầng 2: Tách theo Node (ưu tiên nếu có >= 2 node)
    if (childrenNodes.length >= 2) {
      this.logger.log(`Tầng 2: Tìm thấy ${childrenNodes.length} nodes gốc. Tiến hành tách theo Node...`);
      splitResults = await this.splitByNodes(sourceFilePath, io, childrenNodes.length, outputDir, outputDirName);
    } 
    // Tầng 3: Fallback tách theo Material
    else {
      this.logger.log(`Tầng 3: Chỉ tìm thấy ${childrenNodes.length} node gốc. Fallback tách theo Material...`);
      // Đọc lại document để chắc chắn document sạch trước khi prune
      splitResults = await this.splitByMaterials(sourceFilePath, io, outputDir, outputDirName);
    }

    return {
      rootFileUrl,
      children: splitResults,
    };
  }

  async splitGltfAsLod(
    sourceFilePath: string,
    parentId: string,
  ): Promise<{ rootFileUrl: string; children: SplitResult[] }> {
    const io = await this.getIO();
    const document = await io.read(sourceFilePath);

    // Treat the selected node's GLB as a local LOD model. Flatten first so
    // nested wrappers from earlier splits do not hide real mesh nodes.
    await document.transform(flatten({ cleanup: false }));

    const scenes = document.getRoot().listScenes();
    const scene = document.getRoot().getDefaultScene() || scenes[0];
    if (!scene) {
      throw new Error('No scene found in glTF file');
    }

    const outputDirName = `scenes/${parentId}`;
    const outputDir = join(process.cwd(), 'uploads', outputDirName);
    mkdirSync(outputDir, { recursive: true });

    const rootFileName = `lod-source.glb`;
    const rootFilePath = join(outputDir, rootFileName);
    const flattenedBuffer = await io.writeBinary(document);
    writeFileSync(rootFilePath, Buffer.from(flattenedBuffer));
    const rootFileUrl = `/uploads/${outputDirName}/${rootFileName}`;

    const meshNodes = scene
      .listChildren()
      .filter((node) => node.getMesh() !== null);

    let splitResults: SplitResult[] = [];

    if (meshNodes.length >= 2) {
      this.logger.log(
        `LOD split: found ${meshNodes.length} mesh nodes. Splitting selected node model by mesh node...`,
      );
      splitResults = await this.splitFlattenedByMeshNodes(
        flattenedBuffer,
        io,
        meshNodes.length,
        outputDir,
        outputDirName,
      );
    } else {
      this.logger.log(
        `LOD split: found ${meshNodes.length} mesh node. Falling back to material split...`,
      );
      splitResults = await this.splitFlattenedByMaterials(
        flattenedBuffer,
        io,
        outputDir,
        outputDirName,
      );
    }

    return {
      rootFileUrl,
      children: splitResults,
    };
  }

  private getFiniteCenter(node: Node | Scene) {
    const box = getBounds(node);
    if (box && isFinite(box.min[0]) && isFinite(box.max[0])) {
      return {
        x: (box.min[0] + box.max[0]) / 2,
        y: (box.min[1] + box.max[1]) / 2,
        z: (box.min[2] + box.max[2]) / 2,
      };
    }
    return { x: 0, y: 0, z: 0 };
  }

  private async splitFlattenedByMeshNodes(
    flattenedBuffer: Uint8Array,
    io: NodeIO,
    nodeCount: number,
    outputDir: string,
    outputDirName: string,
  ): Promise<SplitResult[]> {
    const splitResults: SplitResult[] = [];
    const usedFileNames = new Set<string>();

    for (let i = 0; i < nodeCount; i++) {
      try {
        const childDoc = await io.readBinary(flattenedBuffer);
        const clonedScenes = childDoc.getRoot().listScenes();
        const clonedScene = childDoc.getRoot().getDefaultScene() || clonedScenes[0];
        const meshNodes = clonedScene
          .listChildren()
          .filter((node) => node.getMesh() !== null);
        const targetNode = meshNodes[i];
        if (!targetNode) continue;

        const childName = targetNode.getName() || `Node_${i}`;

        for (const node of clonedScene.listChildren()) {
          if (node !== targetNode) {
            node.detach();
          }
        }

        const center = this.getFiniteCenter(targetNode);
        const wrapperNode = childDoc.createNode(`${childName}_wrapper`);
        clonedScene.addChild(wrapperNode);

        targetNode.detach();
        wrapperNode.addChild(targetNode);
        wrapperNode.setTranslation([-center.x, -center.y, -center.z]);

        await childDoc.transform(prune());

        const glbBuffer = await io.writeBinary(childDoc);
        const childFileName = this.createUniqueFileName(childName, usedFileNames);
        const childFilePath = join(outputDir, childFileName);

        writeFileSync(childFilePath, Buffer.from(glbBuffer));

        splitResults.push({
          name: childName,
          fileUrl: `/uploads/${outputDirName}/${childFileName}`,
          position: center,
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        });
      } catch (err: any) {
        this.logger.error(`Error processing LOD mesh node at index ${i}: ${err.message}`);
      }
    }

    return splitResults;
  }

  private async splitFlattenedByMaterials(
    flattenedBuffer: Uint8Array,
    io: NodeIO,
    outputDir: string,
    outputDirName: string,
  ): Promise<SplitResult[]> {
    const document = await io.readBinary(flattenedBuffer);
    const materials = document.getRoot().listMaterials();
    const splitResults: SplitResult[] = [];
    const usedFileNames = new Set<string>();

    if (materials.length <= 1) {
      this.logger.warn('LOD split found fewer than two materials; no deeper parts can be produced.');
      return splitResults;
    }

    for (let i = 0; i < materials.length; i++) {
      const materialName = materials[i].getName() || `Material_${i}`;

      try {
        const childDoc = await io.readBinary(flattenedBuffer);
        const clonedRoot = childDoc.getRoot();
        const clonedMaterial = clonedRoot.listMaterials()[i];
        const clonedScenes = clonedRoot.listScenes();
        const clonedScene = clonedRoot.getDefaultScene() || clonedScenes[0];
        let hasGeometry = false;

        for (const mesh of clonedRoot.listMeshes()) {
          for (const prim of mesh.listPrimitives()) {
            if (prim.getMaterial() !== clonedMaterial) {
              prim.dispose();
            } else {
              hasGeometry = true;
            }
          }
        }

        if (!hasGeometry) continue;

        const center = this.getFiniteCenter(clonedScene);
        const wrapperNode = childDoc.createNode(`${materialName}_wrapper`);
        clonedScene.addChild(wrapperNode);

        const clonedChildren = [...clonedScene.listChildren()];
        for (const child of clonedChildren) {
          if (child === wrapperNode) continue;
          child.detach();
          wrapperNode.addChild(child);
        }
        wrapperNode.setTranslation([-center.x, -center.y, -center.z]);

        await childDoc.transform(prune());

        const glbBuffer = await io.writeBinary(childDoc);
        const childFileName = this.createUniqueFileName(materialName, usedFileNames);
        const childFilePath = join(outputDir, childFileName);

        writeFileSync(childFilePath, Buffer.from(glbBuffer));

        splitResults.push({
          name: materialName,
          fileUrl: `/uploads/${outputDirName}/${childFileName}`,
          position: center,
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        });
      } catch (err: any) {
        this.logger.error(`Error processing LOD material ${materialName}: ${err.message}`);
      }
    }

    return splitResults;
  }

  private async splitByNodes(
    sourceFilePath: string,
    io: NodeIO,
    nodeCount: number,
    outputDir: string,
    outputDirName: string
  ): Promise<SplitResult[]> {
    const splitResults: SplitResult[] = [];
    const usedFileNames = new Set<string>();

    for (let i = 0; i < nodeCount; i++) {
      try {
        const childDoc = await io.read(sourceFilePath);
        
        const clonedScenes = childDoc.getRoot().listScenes();
        const clonedScene = childDoc.getRoot().getDefaultScene() || clonedScenes[0];
        const clonedChildren = clonedScene.listChildren();
        
        const targetClonedChild = clonedChildren[i];
        if (!targetClonedChild) continue;

        const childName = targetClonedChild.getName() || `Node_${i}`;
        this.logger.log(`Processing node: ${childName}`);

        // Xóa các node con khác
        for (let j = 0; j < clonedChildren.length; j++) {
          if (j !== i) {
            clonedChildren[j].detach();
          }
        }

        // Tính bounding box để dịch chuyển về [0,0,0]
        const box = getBounds(targetClonedChild);
        let cx = 0, cy = 0, cz = 0;
        if (box && isFinite(box.min[0]) && isFinite(box.max[0])) {
          cx = (box.min[0] + box.max[0]) / 2;
          cy = (box.min[1] + box.max[1]) / 2;
          cz = (box.min[2] + box.max[2]) / 2;
        }

        const wrapperNode = childDoc.createNode(`${childName}_wrapper`);
        clonedScene.addChild(wrapperNode);
        
        targetClonedChild.detach();
        wrapperNode.addChild(targetClonedChild);
        wrapperNode.setTranslation([-cx, -cy, -cz]);

        await childDoc.transform(prune());

        const glbBuffer = await io.writeBinary(childDoc);
        const childFileName = this.createUniqueFileName(childName, usedFileNames);
        const childFilePath = join(outputDir, childFileName);
        
        writeFileSync(childFilePath, Buffer.from(glbBuffer));

        splitResults.push({
          name: childName,
          fileUrl: `/uploads/${outputDirName}/${childFileName}`,
          position: { x: cx, y: cy, z: cz },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        });

      } catch (err: any) {
        this.logger.error(`Error processing child at index ${i}: ${err.message}`);
      }
    }
    return splitResults;
  }

  private async splitByMaterials(
    sourceFilePath: string,
    io: NodeIO,
    outputDir: string,
    outputDirName: string
  ): Promise<SplitResult[]> {
    const document = await io.read(sourceFilePath);
    const splitResults: SplitResult[] = [];
    const usedFileNames = new Set<string>();
    const root = document.getRoot();
    const materials = root.listMaterials();
    
    if (materials.length === 0) {
      this.logger.warn(`Không có material nào để tách!`);
      return splitResults;
    }

    for (let i = 0; i < materials.length; i++) {
      const material = materials[i];
      const materialName = material.getName() || `Material_${i}`;
      this.logger.log(`Processing material: ${materialName}`);

      try {
        // Read clean copy for each material to avoid mutating the original document
        const clonedDoc = await io.read(sourceFilePath);
        const clonedRoot = clonedDoc.getRoot();
        const clonedMaterial = clonedRoot.listMaterials()[i];

        // Lọc lại tất cả meshes, chỉ giữ các primitives có material này
        const meshes = clonedRoot.listMeshes();
        let hasGeometry = false;

        for (const mesh of meshes) {
          const primitives = mesh.listPrimitives();
          for (const prim of primitives) {
            if (prim.getMaterial() !== clonedMaterial) {
              prim.dispose(); // Bỏ primitive này
            } else {
              hasGeometry = true;
            }
          }
        }

        if (!hasGeometry) continue;

        // Origin Fix fallback theo Material (tính getBounds của scene sau khi đã bỏ bớt geometry)
        const clonedScene = clonedRoot.getDefaultScene() || clonedRoot.listScenes()[0];
        const box = getBounds(clonedScene);
        let cx = 0, cy = 0, cz = 0;
        if (box && isFinite(box.min[0]) && isFinite(box.max[0])) {
          cx = (box.min[0] + box.max[0]) / 2;
          cy = (box.min[1] + box.max[1]) / 2;
          cz = (box.min[2] + box.max[2]) / 2;
        }

        // Tạo wrapper để origin fix cho toàn bộ child nodes của scene
        const clonedChildren = clonedScene.listChildren();
        const wrapperNode = clonedDoc.createNode(`${materialName}_wrapper`);
        clonedScene.addChild(wrapperNode);
        
        for (const child of clonedChildren) {
          child.detach();
          wrapperNode.addChild(child);
        }
        wrapperNode.setTranslation([-cx, -cy, -cz]);

        await clonedDoc.transform(prune());

        const glbBuffer = await io.writeBinary(clonedDoc);
        const childFileName = this.createUniqueFileName(materialName, usedFileNames);
        const childFilePath = join(outputDir, childFileName);
        
        writeFileSync(childFilePath, Buffer.from(glbBuffer));

        splitResults.push({
          name: materialName,
          fileUrl: `/uploads/${outputDirName}/${childFileName}`,
          position: { x: cx, y: cy, z: cz },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        });
      } catch (err: any) {
        this.logger.error(`Error processing material ${materialName}: ${err.message}`);
      }
    }

    return splitResults;
  }
}
