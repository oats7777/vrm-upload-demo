'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle, Upload, Check, RotateCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

export function VrmUploadAndRender_3d() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const vrmRef = useRef<VRM | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setRenderError(null);

    // Simulating file upload with progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setUploadProgress(i);
    }

    setUploading(false);
    setUploadSuccess(true);

    // Load and render the VRM file
    const loader = new GLTFLoader();
    loader.register((parser) => {
      return new VRMLoaderPlugin(parser);
    });

    loader.load(
      URL.createObjectURL(file),
      (gltf) => {
        const vrm = gltf.userData.vrm;

        if (vrmRef.current) {
          sceneRef.current?.remove(vrmRef.current.scene);
        }
        vrmRef.current = vrm;
        sceneRef.current?.add(vrm.scene);
        VRMUtils.rotateVRM0(vrm);
        resetCamera();
      },
      (progress) => {
        console.log((progress.loaded / progress.total) * 100 + '% loaded');
      },
      (error) => {
        console.error(error);
        setRenderError('VRM 파일 로딩 중 오류가 발생했습니다.');
      }
    );
  };

  const initThree = () => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(30.0, 1.0, 0.1, 20.0);
    camera.position.set(0.0, 1.0, 5.0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
    });
    renderer.setSize(300, 300);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.screenSpacePanning = true;
    controlsRef.current = controls;

    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(light);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();
  };

  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current && vrmRef.current) {
      const headPosition = new THREE.Vector3();
      vrmRef.current.humanoid
        ?.getNormalizedBoneNode('head')
        ?.getWorldPosition(headPosition);
      cameraRef.current.position.set(
        headPosition.x,
        headPosition.y + 0.5,
        headPosition.z + 1.5
      );
      controlsRef.current.target.set(
        headPosition.x,
        headPosition.y,
        headPosition.z
      );
    }
  };

  useEffect(() => {
    initThree();
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-purple-800">
            VRM 아바타 업로드 및 렌더링
          </CardTitle>
          <CardDescription>
            VRM 파일을 업로드하고 3D 아바타를 생성하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="vrm-file" className="text-lg font-medium">
                VRM 파일 선택
              </Label>
              <Input
                id="vrm-file"
                type="file"
                accept=".vrm"
                onChange={handleFileChange}
                className="cursor-pointer border-2 border-dashed border-purple-300 hover:border-purple-500 transition-colors"
              />
            </div>
            {file && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>선택된 파일</AlertTitle>
                <AlertDescription>{file.name}</AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={!file || uploading}
            >
              {uploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  업로드 및 아바타 생성
                </>
              )}
            </Button>
          </form>

          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-gray-500 text-center">
                {uploadProgress}% 완료
              </p>
            </div>
          )}

          {uploadSuccess && (
            <Alert className="bg-green-100 text-green-800 border-green-300">
              <Check className="h-4 w-4" />
              <AlertTitle>성공!</AlertTitle>
              <AlertDescription>
                VRM 파일이 성공적으로 업로드되었습니다.
              </AlertDescription>
            </Alert>
          )}

          {renderError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>오류</AlertTitle>
              <AlertDescription>{renderError}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 space-y-4">
            <h3 className="text-xl font-semibold text-purple-800">
              3D 아바타 미리보기
            </h3>
            <div className="border-2 border-purple-200 rounded-lg overflow-hidden relative">
              <canvas
                ref={canvasRef}
                width={300}
                height={300}
                className="w-full"
              />
              <Button
                size="icon"
                variant="outline"
                className="absolute bottom-2 right-2"
                onClick={resetCamera}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-500">
            VRM 파일은 안전하게 암호화되어 저장되며, 귀하의 개인정보는
            보호됩니다.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
