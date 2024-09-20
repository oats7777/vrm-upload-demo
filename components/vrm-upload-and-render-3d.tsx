'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle, Upload, Check, RotateCw, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const [messages, setMessages] = useState<
    { text: string; sender: 'user' | 'avatar' }[]
  >([]);
  const [inputMessage, setInputMessage] = useState('');
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      setMessages([...messages, { text: inputMessage, sender: 'user' }]);
      setInputMessage('');
      // Simulate avatar response
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { text: '안녕하세요! 무엇을 도와드릴까요?', sender: 'avatar' },
        ]);
      }, 1000);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8 text-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
            VRM 아바타 업로드 및 채팅
          </h1>
          <p className="text-xl text-gray-400">
            3D 아바타를 업로드하고 대화를 나눠보세요.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="bg-gray-800 border-gray-700 shadow-2xl lg:col-span-1">
            <CardHeader className="border-b border-gray-700 pb-6">
              <CardTitle className="text-2xl font-bold text-gray-200">
                파일 업로드
              </CardTitle>
              <CardDescription className="text-gray-400">
                VRM 파일을 선택하고 업로드하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="vrm-file"
                    className="text-lg font-medium text-gray-200"
                  >
                    VRM 파일 선택
                  </Label>
                  <Input
                    id="vrm-file"
                    type="file"
                    accept=".vrm"
                    onChange={handleFileChange}
                    className="cursor-pointer border-2 border-dashed border-gray-600 hover:border-purple-500 transition-colors bg-gray-700 text-gray-200"
                  />
                </div>
                {file && (
                  <Alert
                    variant="default"
                    className="bg-gray-700 border-gray-600"
                  >
                    <AlertCircle className="h-4 w-4 text-purple-400" />
                    <AlertTitle className="text-gray-200">
                      선택된 파일
                    </AlertTitle>
                    <AlertDescription className="text-gray-300">
                      {file.name}
                    </AlertDescription>
                  </Alert>
                )}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
                  disabled={!file || uploading}
                >
                  {uploading ? (
                    <>
                      <Upload className="mr-2 h-5 w-5 animate-spin" />
                      업로드 중...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      업로드 및 아바타 생성
                    </>
                  )}
                </Button>
              </form>

              {uploading && (
                <div className="space-y-2">
                  <Progress
                    value={uploadProgress}
                    className="w-full h-2 bg-gray-700"
                  />
                  <p className="text-sm text-gray-400 text-center">
                    {uploadProgress}% 완료
                  </p>
                </div>
              )}

              {uploadSuccess && (
                <Alert
                  variant="default"
                  className="bg-green-900 border-green-700 text-green-100"
                >
                  <Check className="h-4 w-4 text-green-400" />
                  <AlertTitle className="text-green-100">성공!</AlertTitle>
                  <AlertDescription className="text-green-200">
                    VRM 파일이 성공적으로 업로드되었습니다.
                  </AlertDescription>
                </Alert>
              )}

              {renderError && (
                <Alert
                  variant="destructive"
                  className="bg-red-900 border-red-700 text-red-100"
                >
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertTitle className="text-red-100">오류</AlertTitle>
                  <AlertDescription className="text-red-200">
                    {renderError}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 shadow-2xl lg:col-span-2 flex flex-col">
            <CardHeader className="border-b border-gray-700 pb-6">
              <CardTitle className="text-2xl font-bold text-gray-200">
                3D 아바타 미리보기 및 채팅
              </CardTitle>
              <CardDescription className="text-gray-400">
                아바타와 대화를 나눠보세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col pt-6">
              <div className="border-2 border-gray-700 rounded-lg overflow-hidden relative bg-gray-900 mb-4 flex-grow">
                <canvas ref={canvasRef} className="w-full h-full" />
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute bottom-4 right-4 bg-gray-800 border-gray-600 hover:bg-gray-700 text-gray-200"
                  onClick={resetCamera}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="h-64 bg-gray-900 rounded-lg p-4 flex flex-col">
                <ScrollArea className="flex-grow mb-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`mb-2 ${
                        message.sender === 'user' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <span
                        className={`inline-block p-2 rounded-lg ${
                          message.sender === 'user'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-200'
                        }`}
                      >
                        {message.text}
                      </span>
                    </div>
                  ))}
                </ScrollArea>
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="메시지를 입력하세요..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="flex-grow bg-gray-700 text-gray-200 border-gray-600"
                  />
                  <Button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Send className="h-4 w-4" />
                    <span className="sr-only">전송</span>
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
