import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { httpsCallable } from "firebase/functions";
import { signInWithPopup, GoogleAuthProvider, signInAnonymously, User, onAuthStateChanged } from "firebase/auth";
import { auth, functions } from './firebase-config';

type View = 'upload' | 'mask' | 'result';

// --- Reusable Logo Component ---
const Logo: React.FC<{href?: string}> = ({href = "index.html"}) => (
    <a href={href} className="logo" aria-label="WatermarkRemover.ai Homepage">
        <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="20" cy="20" r="19" className="logo-outline" />
            <circle cx="20" cy="20" r="4" className="logo-dot" />
        </svg>
        <span>WatermarkRemover.ai</span>
    </a>
);

// --- View Components ---

const Header: React.FC<{ onLoginClick: () => void }> = ({ onLoginClick }) => (
    <header className="app-header container">
        <Logo />
        <button className="login-btn" onClick={onLoginClick}>
            <i className="fa-solid fa-right-to-bracket"></i>
            Login / Sign Up
        </button>
    </header>
);

interface HeroSectionProps {
    onFileChange: (file: File | null) => void;
    isLoading: boolean;
    error: string | null;
    activeTab: 'auto' | 'manual';
    setActiveTab: (tab: 'auto' | 'manual') => void;
}
const HeroSection: React.FC<HeroSectionProps> = ({ onFileChange, isLoading, error, activeTab, setActiveTab }) => (
    <section className="hero-section">
        <h1>Erase Watermarks with a <span className="sparkle">Sparkle</span></h1>
        <p>Our AI magically removes unwanted objects, text, and logos from your images in seconds. Get 3 free removals per day!</p>
        <div className="uploader-wrapper">
             <div className="tabs">
                <button className={`tab ${activeTab === 'auto' ? 'active' : ''}`} onClick={() => setActiveTab('auto')}>
                    Auto Remove
                </button>
                <button className={`tab ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => setActiveTab('manual')}>
                    Manual Brush <span className="new-badge">PRO</span>
                </button>
            </div>
            {isLoading ? (
                <div className="loader-container">
                    <div className="loader"></div>
                    <p>AI is working its magic...</p>
                </div>
            ) : (
                <FileUploader onFileChange={onFileChange} />
            )}
            {error && <p className="error-message">{error}</p>}
        </div>
    </section>
);

const FileUploader: React.FC<{ onFileChange: (file: File | null) => void }> = ({ onFileChange }) => {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragging(true);
        } else if (e.type === "dragleave") {
            setIsDragging(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileChange(e.target.files[0]);
        }
    };

    return (
        <div
            className={`uploader-container ${isDragging ? 'drag-over' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
        >
            <input type="file" ref={inputRef} onChange={handleChange} style={{ display: 'none' }} accept="image/jpeg,image/png,image/webp" />
            <p>Drag & drop your image here, or</p>
            <button className="upload-btn">
                 <i className="fa-solid fa-upload"></i>
                 Choose File
            </button>
            <p className="file-formats">Supports: <span>JPG</span> <span>PNG</span> <span>WEBP</span></p>
        </div>
    );
};


interface MaskingSectionProps {
    imageSrc: string;
    onSubmit: (maskBase64: string) => void;
    onBack: () => void;
    isLoading: boolean;
}

const MaskingSection: React.FC<MaskingSectionProps> = ({ imageSrc, onSubmit, onBack, isLoading }) => {
    // A single Path is an array of points
    type Path = { x: number; y: number }[];

    // Component to handle the masking canvas and controls
    const MaskingTool: React.FC<{
        imageSrc: string;
        onSubmit: (maskBase64: string) => void;
        onBack: () => void;
        isLoading: boolean;
    }> = ({ imageSrc, onSubmit, onBack, isLoading }) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const imageRef = useRef<HTMLImageElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);

        const [isDrawing, setIsDrawing] = useState(false);
        const [paths, setPaths] = useState<Path[]>([]);
        const [brushSize, setBrushSize] = useState(40);
        const [history, setHistory] = useState<Path[][]>([]);
        const [historyIndex, setHistoryIndex] = useState(-1);

        const redrawCanvas = useCallback((currentPaths: Path[]) => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = 'white';
            ctx.lineWidth = brushSize;
            currentPaths.forEach(path => {
                if (path.length < 2) return;
                ctx.beginPath();
                ctx.moveTo(path[0].x, path[0].y);
                for (let i = 1; i < path.length; i++) {
                    ctx.lineTo(path[i].x, path[i].y);
                }
                ctx.stroke();
            });
        }, [brushSize]);

        useEffect(() => {
            redrawCanvas(paths);
        }, [paths, brushSize, redrawCanvas]);

        const handleImageLoad = () => {
            const canvas = canvasRef.current;
            const image = imageRef.current;
            if (canvas && image && containerRef.current) {
                const { width, height } = image.getBoundingClientRect();
                canvas.width = width;
                canvas.height = height;
                redrawCanvas(paths);
            }
        };

        const getCoords = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
            const canvas = canvasRef.current;
            if (!canvas) return null;
            const rect = canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
        };

        const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
            const coords = getCoords(e);
            if (!coords) return;
            setIsDrawing(true);
            const newPath = [coords];
            setPaths(prevPaths => [...prevPaths, newPath]);
             // When starting a new drawing, clear the "redo" history
            if (historyIndex < history.length - 1) {
                setHistory(history.slice(0, historyIndex + 1));
            }
        };

        const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (!isDrawing) return;
            const coords = getCoords(e);
            if (!coords) return;
            setPaths(prevPaths => {
                const newPaths = [...prevPaths];
                const lastPath = newPaths[newPaths.length - 1];
                const newLastPath = [...lastPath, coords];
                newPaths[newPaths.length - 1] = newLastPath;
                return newPaths;
            });
        };

        const endDrawing = () => {
            if (!isDrawing) return;
            setIsDrawing(false);
            // After drawing, save the current state to history
            setHistory(prev => {
                const newHistory = [...prev, paths];
                setHistoryIndex(newHistory.length - 1);
                return newHistory;
            });
        };
        
        const undo = () => {
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setPaths(history[newIndex]);
            } else if (historyIndex === 0) { // First action
                 setHistoryIndex(-1);
                 setPaths([]);
            }
        };

        const redo = () => {
            if (historyIndex < history.length - 1) {
                const newIndex = historyIndex + 1;
                setHistoryIndex(newIndex);
                setPaths(history[newIndex]);
            }
        };
        
        const clear = () => {
             setPaths([]);
             setHistory(prev => {
                const newHistory = [...prev, []]; // Add empty state to history
                setHistoryIndex(newHistory.length - 1);
                return newHistory;
            });
        };

        const getMaskAsBase64 = (): string => {
            const canvas = document.createElement('canvas');
            const image = imageRef.current;
            if (!image) return '';
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return '';
        
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        
            ctx.strokeStyle = '#fff';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            const scaleX = image.naturalWidth / image.width;
            const scaleY = image.naturalHeight / image.height;
            ctx.lineWidth = brushSize * scaleX;
        
            paths.forEach(path => {
                if (path.length < 2) return;
                ctx.beginPath();
                ctx.moveTo(path[0].x * scaleX, path[0].y * scaleY);
                for (let i = 1; i < path.length; i++) {
                    ctx.lineTo(path[i].x * scaleX, path[i].y * scaleY);
                }
                ctx.stroke();
            });
        
            return canvas.toDataURL('image/png');
        };

        const handleSubmit = () => {
            const maskBase64 = getMaskAsBase64();
            onSubmit(maskBase64);
        };

        useEffect(() => {
            window.addEventListener('resize', handleImageLoad);
            return () => window.removeEventListener('resize', handleImageLoad);
        }, []);


        return (
            <div className="masking-tool">
                 <div className="masking-canvas-container" ref={containerRef}>
                    <img ref={imageRef} src={imageSrc} alt="Original to mask" onLoad={handleImageLoad} />
                    <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={endDrawing} onMouseLeave={endDrawing} />
                </div>
                <div className="masking-controls">
                    <button onClick={onBack} className="back-btn" disabled={isLoading}>
                        <i className="fa-solid fa-arrow-left"></i> Back
                    </button>
                     <div className="center-controls">
                        <div className="brush-slider-container">
                            <label htmlFor="brush-size">Brush Size</label>
                            <input
                                id="brush-size"
                                type="range"
                                min="5"
                                max="100"
                                value={brushSize}
                                onChange={(e) => setBrushSize(Number(e.target.value))}
                                className="brush-slider"
                                aria-label="Brush Size"
                            />
                        </div>
                        <div className="history-buttons">
                           <button onClick={undo} disabled={historyIndex < 0} aria-label="Undo"><i className="fa-solid fa-rotate-left"></i> Undo</button>
                           <button onClick={redo} disabled={historyIndex >= history.length - 1} aria-label="Redo"><i className="fa-solid fa-rotate-right"></i> Redo</button>
                           <button onClick={clear} disabled={paths.length === 0} aria-label="Clear Mask"><i className="fa-solid fa-trash"></i> Clear</button>
                        </div>
                    </div>
                    <button onClick={handleSubmit} className="submit-btn" disabled={isLoading || paths.length === 0}>
                        {isLoading ? 'Processing...' : (
                            <>
                                <i className="fa-solid fa-wand-magic-sparkles"></i> Remove Watermark
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <section className="masking-section">
            <h2>Paint Over the Watermark</h2>
            <p>Use the brush to highlight the area you want to remove. Our AI will do the rest.</p>
            {isLoading ? (
                 <div className="loader-container">
                    <div className="loader"></div>
                    <p>AI is removing the selected area...</p>
                </div>
            ) : (
                <MaskingTool
                    imageSrc={imageSrc}
                    onSubmit={onSubmit}
                    onBack={onBack}
                    isLoading={isLoading}
                />
            )}
        </section>
    );
};


interface ResultSectionProps {
    originalSrc: string;
    resultSrc: string;
    onReset: () => void;
}
const ResultSection: React.FC<ResultSectionProps> = ({ originalSrc, resultSrc, onReset }) => {
    const [sliderPos, setSliderPos] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    const handleMove = useCallback((clientX: number) => {
        if (!isDragging.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPos(pos);
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => handleMove(e.clientX), [handleMove]);
    const handleTouchMove = useCallback((e: TouchEvent) => handleMove(e.touches[0].clientX), [handleMove]);

    const stopDragging = useCallback(() => {
        isDragging.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', stopDragging);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', stopDragging);
    }, [handleMouseMove, handleTouchMove]);

    const startDragging = useCallback(() => {
        isDragging.current = true;
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', stopDragging);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', stopDragging);
    }, [handleMouseMove, stopDragging, handleTouchMove]);


    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = resultSrc;
        link.download = 'watermark-removed-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
        <section className="results-section">
            <h2>Your Image is Ready!</h2>
            <p>Slide to compare the original and the result.</p>
            <div className="comparison-container" ref={containerRef} onMouseDown={startDragging} onTouchStart={startDragging}>
                <img src={resultSrc} alt="Result" className="comparison-image" />
                <div className="image-original-wrapper" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                    <img src={originalSrc} alt="Original" className="comparison-image" />
                </div>
                <div className="comparison-slider" style={{ left: `${sliderPos}%` }}>
                    <div className="slider-handle">
                        <i className="fa-solid fa-arrows-left-right"></i>
                    </div>
                </div>
            </div>
             <div className="actions">
                <button onClick={handleDownload} className="download-btn">
                    <i className="fa-solid fa-download"></i> Download Image
                </button>
                <button onClick={onReset} className="reset-btn">
                    <i className="fa-solid fa-arrow-rotate-left"></i> Remove Another
                </button>
            </div>
        </section>
    );
};

const HowItWorksSection: React.FC = () => (
    <section className="content-section">
        <h2>How It Works</h2>
        <p>A simple, three-step process to get a clean image.</p>
        <div className="steps-grid">
            <div className="step-card">
                <div className="icon"><i className="fa-solid fa-upload"></i></div>
                <h3>1. Upload Image</h3>
                <p>Drag and drop or select a JPG, PNG, or WEBP file from your device.</p>
            </div>
            <div className="step-card">
                 <div className="icon"><i className="fa-solid fa-wand-magic-sparkles"></i></div>
                <h3>2. AI Magic</h3>
                <p>Our AI automatically detects and removes the watermark. For tricky images, use our manual brush for precision control.</p>
            </div>
            <div className="step-card">
                 <div className="icon"><i className="fa-solid fa-download"></i></div>
                <h3>3. Download</h3>
                <p>Preview your clean image and download it in high resolution, completely watermark-free.</p>
            </div>
        </div>
    </section>
);

const ExampleSection: React.FC = () => {
    const beforeImageSrc = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgODAwIDYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjojZjBmMmY1Ij4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg1MCwgNTApIHNjYWxlKDEuMikiPgogICAgPHBhdGggZD0iTTE1MCA0NTIgQyAxMzAgMzAwLCAzMDAgMjUwLCA0NTAgMjgwIEwgNjAwIDI1MCBMIDY1MCAzNTAgTCA1NTAgNDAwIEMgNTAwIDQ4MCwgMjUwIDUwMCwgMTUwIDQ1MCBaIiBmaWxsPSIjZmZmIiBzdHJva2U9IiNkZGQiIHN0cm9rZS13aWR0aD0iNCIvPgogICAgPHBhdGggZD0iTTE1NSA0NDggQyAyNTAgNDkwLCA1MDAgNDcwLCA1NTAgMzk1IEwgNTU4IDQxMCBDIDUwMCA0OTAsIDI2MCA1MTAsIDE2MCA0NjUgWiIgZmlsbD0iI2U1MzkzNSIvPgogICAgPHJlY3QgeD0iMTYwIiB5PSI0NDgiIHdpZHRoPSIzOTUiIGhlaWdodD0iMTAiIGZpbGw9IiNmZmYiIC8+CiAgICA8cGF0aCBkPSJNNTAwIDI5MCBMIDYwMCAyNTAgTCA2NTAgMzUwIEwgNTUwIDM4MCBDIDUyMCAzNTAsIDUwMCAzMjAsIDUwMCAyOTAgWiIgZmlsbD0iI2U1MzkzNSIvPgogICAgPHBhdGggZD0iTTQwMCAyOTAgQyA0NTAgMzUwLCA0ODAgNDAwLCA0NTAgNDIwIEwgMzAwIDQ0MCBDIDI4MCAzODAsIDM1MCAzMDAsIDQwMCAyOTAgWiIgZmlsbD0iI2VlZSIvPgogICAgPGxpbmUgeDE9IjM4MCIgeTE9IjMyMCIgeDI9IjQyMCIgeTI9IjMzMCIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgLz4KICAgIDxsaW5lIHgxPSIzNzAiIHkxPSIzNDAiIHgyPSI0MzAiIHkyPSIzNTAiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+CiAgICA8bGluZSB4MT0iMzYwIiB5MT0iMzYwIiB5Mj0iNDQwIiB5Mj0iMzcwIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPgogICAgPGxpbmUgeDE9IjM1MCIgeTE9IjM4MCIgeDI9IjQ1MCIgeTI9IjM5MCIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgLz4KICAgIDxjaXJjbGUgY3g9IjMwMCIgY3k9IjM1MCIgcj0iMzAiIGZpbGw9IiNmZmYiIHN0cm9rZT0iI2RkZCIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgICA8dGV4dCB4PSIzMDAiIHk9IjM2MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBIZWx2ZXRpY2EsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiNlNTM5MzUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtd2VpZ2h0PSJib2xkIj7imJE8L3RleHQ+CiAgICA8dGV4dCB4PSIzODAiIHk9IjM1MCIgZm9udC1mYW1pbHk9IlZlcmRhbmEsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iODAiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4zIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCIgdHJhbnNmb3JtPSJyb3RhdGUoLTI1IDM4MCAzNTApIiBzdHlsZT0icG9pbnRlci1ldmVudHM6bm9uZTsiPlBSRVZJRVc8L3RleHQ+CiAgPC9nPgo8L3N2Zz4=";
    const afterImageSrc = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgODAwIDYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjojZjBmMmY1Ij4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg1MCwgNTApIHNjYWxlKDEuMikiPgogICAgPHBhdGggZD0iTTE1MCA0NTIgQyAxMzAgMzAwLCAzMDAgMjUwLCA0NTAgMjgwIEwgNjAwIDI1MCBMIDY1MCAzNTAgTCA1NTAgNDAwIEMgNTAwIDQ4MCwgMjUwIDUwMCwgMTUwIDQ1MCBaIiBmaWxsPSIjZmZmIiBzdHJva2U9IiNkZGQiIHN0cm9rZS13aWR0aD0iNCIvPgogICAgPHBhdGggZD0iTTE1NSA0NDggQyAyNTAgNDkwLCA1MDAgNDcwLCA1NTAgMzk1IEwgNTU4IDQxMCBDIDUwMCA0OTAsIDI2MCA1MTAsIDE2MCA0NjUgWiIgZmlsbD0iI2U1MzkzNSIvPgogICAgPHJlY3QgeD0iMTYwIiB5PSI0NDgiIHdpZHRoPSIzOTUiIGhlaWdodD0iMTAiIGZpbGw9IiNmZmYiIC8+CiAgICA8cGF0aCBkPSJNNTAwIDI5MCBMIDYwMCAyNTAgTCA2NTAgMzUwIEwgNTUwIDM4MCBDIDUyMCAzNTAsIDUwMCAzMjAsIDUwMCAyOTAgWiIgZmlsbD0iI2U1MzkzNSIvPgogICAgPHBhdGggZD0iTTQwMCAyOTAgQyA0NTAgMzUwLCA0ODAgNDAwLCA0NTAgNDIwIEwgMzAwIDQ0MCBDIDI4MCAzODAsIDM1MCAzMDAsIDQwMCAyOTAgWiIgZmlsbD0iI2VlZSIvPgogICAgPGxpbmUgeDE9IjM4MCIgeTE9IjMyMCIgeDI9IjQyMCIgeTI9IjMzMCIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgLz4KICAgIDxsaW5lIHgxPSIzNzAiIHkxPSIzNDAiIHgyPSI0MzAiIHkyPSIzNTAiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+CiAgICA8bGluZSB4MT0iMzYwIiB5MT0iMzYwIiB5Mj0iNDQwIiB5Mj0iMzcwIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPgogICAgPGxpbmUgeDE9IjM1MCIgeTE9IjM4MCIgeDI9IjQ1MCIgeTI9IjM5MCIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgLz4KICAgIDxjaXJjbGUgY3g9IjMwMCIgY3k9IjM1MCIgcj0iMzAiIGZpbGw9IiNmZmYiIHN0cm9rZT0iI2RkZCIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgICA8dGV4dCB4PSIzMDAiIHk9IjM2MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBIZWx2ZXRpY2EsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiNlNTM5MzUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtd2VpZ2h0PSJib2xkIj7imJE8L3RleHQ+CiAgPC9nPgo8L3N2Zz4=";

    const [sliderPos, setSliderPos] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    const handleMove = useCallback((clientX: number) => {
        if (!isDragging.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPos(pos);
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => handleMove(e.clientX), [handleMove]);
    const handleTouchMove = useCallback((e: TouchEvent) => handleMove(e.touches[0].clientX), [handleMove]);

    const stopDragging = useCallback(() => {
        isDragging.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', stopDragging);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', stopDragging);
    }, [handleMouseMove, handleTouchMove]);

    const startDragging = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        isDragging.current = true;
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', stopDragging);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', stopDragging);
    }, [handleMouseMove, stopDragging, handleTouchMove]);


    return (
        <section className="content-section example-section">
            <div className="example-grid container">
                <div className="example-text">
                    <h2>See the Magic Happen</h2>
                    <p>From cluttered to clean in one click. Our AI doesn't just cover up watermarks—it intelligently reconstructs the area behind them for a seamless, natural finish.</p>
                    <ul>
                        <li><i className="fa-solid fa-check"></i> Removes text, logos, and date stamps.</li>
                        <li><i className="fa-solid fa-check"></i> Recreates backgrounds with stunning accuracy.</li>
                        <li><i className="fa-solid fa-check"></i> Preserves original image quality and details.</li>
                    </ul>
                </div>
                <div className="example-visual">
                    <div className="comparison-container" ref={containerRef} onMouseDown={startDragging} onTouchStart={startDragging}>
                        <img src={afterImageSrc} alt="Image without watermark" className="comparison-image" />
                        <div className="image-original-wrapper" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                            <img src={beforeImageSrc} alt="Image with watermark" className="comparison-image" />
                        </div>
                        <div className="comparison-slider" style={{ left: `${sliderPos}%` }}>
                            <div className="slider-handle">
                                <i className="fa-solid fa-arrows-left-right"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const FeaturesSection: React.FC = () => (
    <section id="features" className="content-section" style={{backgroundColor: 'var(--background-soft)'}}>
         <h2>Powerful Features</h2>
        <p>Everything you need for perfect, watermark-free photos.</p>
        <div className="features-grid">
            <div className="feature-card">
                <div className="icon"><i className="fa-solid fa-robot"></i></div>
                <div>
                    <h3>Advanced AI Inpainting</h3>
                    <p>Our generative AI intelligently reconstructs the background behind the watermark, ensuring a seamless and natural-looking result.</p>
                </div>
            </div>
             <div className="feature-card">
                <div className="icon"><i className="fa-solid fa-paintbrush"></i></div>
                <div>
                    <h3>Precision Manual Control</h3>
                    <p>The manual brush tool gives you pixel-perfect control to remove complex watermarks or any unwanted object with ease.</p>
                </div>
            </div>
             <div className="feature-card">
                <div className="icon"><i className="fa-solid fa-images"></i></div>
                <div>
                    <h3>Multi-Format Support</h3>
                    <p>We support all popular image formats, including JPG, PNG, and WEBP, for your convenience.</p>
                </div>
            </div>
             <div className="feature-card">
                <div className="icon"><i className="fa-solid fa-shield-halved"></i></div>
                <div>
                    <h3>Privacy First</h3>
                    <p>Your images are your own. We process them securely and delete them from our servers after 24 hours.</p>
                </div>
            </div>
        </div>
    </section>
);

const TestimonialsSection: React.FC = () => {
    const testimonials = [
        {
            quote: "This is a game-changer for my workflow. I used to spend hours manually removing watermarks in Photoshop. Now it takes seconds. Incredible!",
            name: "Sarah J.",
            role: "Professional Photographer",
            stars: 5,
        },
        {
            quote: "I'm amazed by the quality. The AI is so smart it perfectly reconstructs the background. My social media images have never looked cleaner.",
            name: "Alex M.",
            role: "Content Creator",
            stars: 5,
        },
        {
            quote: "As a student, I often need clean images for presentations. This tool is free, fast, and super easy to use. Highly recommend it to everyone!",
            name: "David L.",
            role: "University Student",
            stars: 5,
        },
        {
            quote: "Absolutely essential for my online store. This tool cleans up supplier photos perfectly, saving me time and making my listings look professional.",
            name: "Emily R.",
            role: "eCommerce Store Owner",
            stars: 5,
        },
        {
            quote: "High-quality photos are everything in real estate. WatermarkRemover.ai helps me quickly remove competitor logos from property images.",
            name: "Mark C.",
            role: "Real Estate Agent",
            stars: 5,
        },
        {
            quote: "I was skeptical, but the AI inpainting is seriously impressive. It's much faster than using the clone stamp tool for simple removals. A great new tool in my arsenal.",
            name: "Jessica B.",
            role: "Graphic Designer",
            stars: 5,
        },
        {
            quote: "We use this for our social media campaigns. It lets us repurpose user-generated content without distracting watermarks. The results are instant.",
            name: "Tom H.",
            role: "Marketing Manager",
            stars: 5,
        },
        {
            quote: "I'm digitizing old family photos with photographer stamps. This tool has been invaluable for restoring these memories to their original state.",
            name: "Linda S.",
            role: "Archivist",
            stars: 5,
        },
        {
            quote: "This helps me clean up diagrams and photos I find online for my presentations, making them clearer for my students. The free tier is generous!",
            name: "Kevin P.",
            role: "Teacher",
            stars: 4,
        }
    ];

    const carouselRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (carouselRef.current) {
            const { current } = carouselRef;
            // Scroll by the width of the visible container area
            const scrollAmount = current.clientWidth;
            current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const startAutoplay = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            if (carouselRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
                // Check if we are at the end of the scrollable area
                if (scrollLeft + clientWidth >= scrollWidth - 1) { // -1 for subpixel precision issues
                    carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    scroll('right');
                }
            }
        }, 5000); // Change slide every 5 seconds
    }, []);

    const resetAutoplay = useCallback(() => {
        startAutoplay();
    }, [startAutoplay]);

    useEffect(() => {
        startAutoplay();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [startAutoplay]);

    const handlePrevClick = () => {
        scroll('left');
        resetAutoplay();
    };

    const handleNextClick = () => {
        scroll('right');
        resetAutoplay();
    };

    return (
        <section className="content-section testimonials-section">
            <h2>Trusted by Creators Worldwide</h2>
            <p>Our users love how simple and effective our watermark remover is.</p>
            <div className="testimonials-carousel-container">
                <div className="testimonials-carousel" ref={carouselRef}>
                    {testimonials.map((testimonial, index) => (
                        <div className="testimonial-card" key={index}>
                            <div className="stars">
                                {[...Array(testimonial.stars)].map((_, i) => <i className="fa-solid fa-star" key={i}></i>)}
                                {[...Array(5 - testimonial.stars)].map((_, i) => <i className="fa-regular fa-star" key={i}></i>)}
                            </div>
                            <p className="quote">"{testimonial.quote}"</p>
                            <div className="author">
                                <p className="name">{testimonial.name}</p>
                                <p className="role">{testimonial.role}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={handlePrevClick} className="carousel-btn prev" aria-label="Previous testimonials"><i className="fa-solid fa-chevron-left"></i></button>
                <button onClick={handleNextClick} className="carousel-btn next" aria-label="Next testimonials"><i className="fa-solid fa-chevron-right"></i></button>
            </div>
        </section>
    );
};


const FAQSection: React.FC = () => {
    const faqs = [
      { q: "How do I remove watermarks from photos?", a: "Simply upload your image, and our AI will automatically detect and erase the watermark. For precise control, you can switch to the 'Manual Brush' tab to paint over the area you want to remove. Once processed, you can download the clean image." },
      { q: "Is this tool free to use?", a: "Yes, you can process up to 3 images per day for free without an account. For higher volumes, batch processing, and access to our API, we offer affordable subscription plans." },
      { q: "What file types are supported?", a: "We currently support the most popular image formats: JPG, PNG, and WEBP. We are continuously working to support more formats in the future." },
      { q: "Will the image quality be reduced?", a: "No, our tool is designed to maintain the original quality of your image. The AI intelligently reconstructs the area behind the watermark, resulting in a clean, high-resolution photo without compromising on detail." },
      { q: "Are my uploaded images secure?", a: "Absolutely. We prioritize your privacy. All uploaded images are processed securely and are automatically deleted from our servers after 24 hours. We never share your images with third parties." },
      { q: "Does this work on complex or transparent watermarks?", a: "Yes. Our AI is trained to handle a wide variety of watermarks, including semi-transparent logos, repeating patterns, and text overlays. For extremely challenging cases, the manual brush provides the precision needed for a perfect result." },
      { q: "Can I remove watermarks from multiple images at once?", a: "Batch processing is a feature available in our Pro plan, allowing you to upload and process multiple images simultaneously to speed up your workflow." },
      { q: "Does this tool work on mobile devices?", a: "Yes, our website is fully responsive and designed to work seamlessly on all modern devices, including smartphones and tablets on both iOS and Android." },
      { q: "What should I do if the AI result isn't perfect?", a: "If the automatic removal leaves any artifacts, simply use the 'Manual Brush' tool. This allows you to paint over any remaining parts of the watermark for a pixel-perfect finish before reprocessing the image." },
      { q: "Is using a watermark remover illegal?", a: "Using a watermark remover is legal for personal use, such as restoring a photo you own. However, removing a watermark from a copyrighted image without the owner's permission may infringe on their rights. Always ensure you have the legal right to alter an image." },
      { q: "Do you offer an API for developers?", a: "Yes, we offer a powerful and easy-to-integrate API for developers and businesses who want to incorporate watermark removal into their own applications or workflows. You can find more details on our API page." },
      { q: "Do I need an account to use this service?", a: "No account is needed for our free service. You can start removing watermarks right away. An account is only required if you choose to upgrade to one of our paid subscription plans." },
    ];
    const [openIndex, setOpenIndex] = useState<number | null>(0);
    return (
        <section className="content-section faq-section">
            <h2>Frequently Asked Questions</h2>
            {faqs.map((faq, index) => (
                <div className="faq-item" key={index}>
                    <div className="faq-question" onClick={() => setOpenIndex(openIndex === index ? null : index)} role="button" aria-expanded={openIndex === index}>
                        <span>{faq.q}</span>
                        <i className={`fa-solid fa-plus ${openIndex === index ? 'open' : ''}`}></i>
                    </div>
                    <div className={`faq-answer ${openIndex === index ? 'open' : ''}`}>
                        <p>{faq.a}</p>
                    </div>
                </div>
            ))}
        </section>
    );
};

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
    const [view, setView] = useState<'login' | 'signup'>('login');

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    useEffect(() => {
        if(isOpen) {
            setView('login');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">&times;</button>
                <h2>{view === 'login' ? 'Welcome Back' : 'Create an Account'}</h2>
                <p>{view === 'login' ? 'Login to access all your features.' : 'Sign up to get started with 3 free credits.'}</p>

                <button className="google-btn">
                    <i className="fa-brands fa-google"></i>
                    Continue with Google
                </button>

                <div className="divider">
                    <span>OR</span>
                </div>

                <form onSubmit={(e) => e.preventDefault()}>
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input type="email" id="email" placeholder="you@example.com" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input type="password" id="password" placeholder="••••••••" required />
                    </div>
                    {view === 'signup' && (
                         <div className="form-group">
                            <label htmlFor="confirm-password">Confirm Password</label>
                            <input type="password" id="confirm-password" placeholder="••••••••" required />
                        </div>
                    )}
                    <button type="submit" className="form-submit-btn">
                        {view === 'login' ? 'Login' : 'Create Account'}
                    </button>
                </form>

                <div className="switch-view">
                    {view === 'login' ? (
                        <p>Don't have an account? <button onClick={() => setView('signup')}>Sign up</button></p>
                    ) : (
                        <p>Already have an account? <button onClick={() => setView('login')}>Log in</button></p>
                    )}
                </div>
            </div>
        </div>
    );
};


const Footer: React.FC = () => (
    <footer className="app-footer">
        <div className="container">
            <div className="footer-content">
                <div className="footer-about">
                    <Logo />
                    <p>The smartest AI-powered tool to make your images clean and professional. Remove any unwanted watermarks in just a few clicks.</p>
                </div>
                 <div className="footer-links">
                    <div>
                        <h4>Product</h4>
                        <ul>
                            <li><a href="#features">Features</a></li>
                            <li><a href="pricing.html">Pricing</a></li>
                            <li><a href="api.html">API</a></li>
                        </ul>
                    </div>
                     <div>
                        <h4>Company</h4>
                        <ul>
                            <li><a href="about.html">About Us</a></li>
                            <li><a href="contact.html">Contact</a></li>
                            <li><a href="privacy.html">Privacy Policy</a></li>
                             <li><a href="terms.html">Terms of Service</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} WatermarkRemover.ai. All rights reserved.</p>
            </div>
        </div>
    </footer>
);

// --- Main App Component ---
const App: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<{ b64: string, type: string } | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<View>('upload');
    const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const resultsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.substring(1);
            if (hash) {
                const element = document.getElementById(hash);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }
        };
    
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();
    
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);


    useEffect(() => {
        if (view === 'result' && resultsRef.current) {
            resultsRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [view]);

    const handleFileChange = (file: File | null) => {
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setError('Unsupported format. Please upload a JPG, PNG, or WEBP file.');
            return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            const dataUrl = e.target?.result as string;
            const base64Image = dataUrl.split(',')[1];
            if (base64Image) {
                setOriginalImage({ b64: base64Image, type: file.type });
                setError(null);
                setResultImage(null);
                if (activeTab === 'auto') {
                    await removeWatermark(base64Image, file.type);
                } else {
                    setView('mask');
                }
            }
        };
        reader.onerror = () => setError('Failed to read the file.');
        reader.readAsDataURL(file);
    };

    const processImageWithAI = async (parts: ({ text: string } | { inlineData: { data: string; mimeType: string; } })[]) => {
        setIsLoading(true);
        setView('upload'); // Show loader in the main view
        try {
            // Безопасный вызов нашего бэкенда вместо прямого Gemini API
            const removeWatermarkCallable = httpsCallable(functions, 'removeWatermarkWithAI');
            const result = await removeWatermarkCallable({ parts });
            const { data, mimeType, remainingCredits } = result.data as {
                data: string;
                mimeType: string;
                remainingCredits: number;
            };
            
            setResultImage(`data:${mimeType};base64,${data}`);
            setView('result');
            
            // Показываем информацию о лимитах
            if (remainingCredits >= 0) {
                console.log(`Осталось попыток: ${remainingCredits}`);
            }
        } catch (err: any) {
            if (err.code === 'functions/permission-denied') {
                setError('У вас закончились бесплатные попытки. Войдите в систему или обновитесь до Pro!');
            } else {
                setError(err.message || 'Произошла ошибка при обработке изображения.');
            }
            setOriginalImage(null);
            setView('upload');
        } finally {
            setIsLoading(false);
        }
    };

    const removeWatermark = async (base64ImageData: string, imageMimeType: string) => {
        const parts = [
            { inlineData: { data: base64ImageData, mimeType: imageMimeType } },
            { text: 'Completely remove any watermarks, logos, or text from this image. Intelligently reconstruct the background where the elements were removed to create a clean, natural-looking photo.' }
        ];
        await processImageWithAI(parts);
    };

    const removeWatermarkWithMask = async (maskBase64: string) => {
        if (!originalImage) return;
        const maskData = maskBase64.split(',')[1];
        const parts = [
            { inlineData: { data: originalImage.b64, mimeType: originalImage.type } },
            { inlineData: { data: maskData, mimeType: 'image/png' } },
            { text: 'Use the second image as a mask for the first image. The white areas on the mask indicate the parts to be removed from the first image. Inpaint the removed areas by reconstructing the background based on the surrounding pixels.' }
        ];
        await processImageWithAI(parts);
    };

    const handleReset = () => {
        setOriginalImage(null);
        setResultImage(null);
        setError(null);
        setIsLoading(false);
        setView('upload');
    };

    const getOriginalImageDataUrl = () => originalImage ? `data:${originalImage.type};base64,${originalImage.b64}` : '';

    return (
        <>
            <Header onLoginClick={() => setIsModalOpen(true)} />
            <main className="container">
                {view === 'upload' && (
                    <HeroSection
                        onFileChange={handleFileChange}
                        isLoading={isLoading}
                        error={error}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                    />
                )}
                 {view === 'mask' && originalImage && (
                    <MaskingSection
                        imageSrc={getOriginalImageDataUrl()}
                        onSubmit={removeWatermarkWithMask}
                        onBack={handleReset}
                        isLoading={isLoading}
                    />
                )}
                {view === 'result' && resultImage && (
                     <div ref={resultsRef}>
                        <ResultSection
                            originalSrc={getOriginalImageDataUrl()}
                            resultSrc={resultImage}
                            onReset={handleReset}
                        />
                    </div>
                )}

                <HowItWorksSection />
                <ExampleSection />
                <FeaturesSection />
                <TestimonialsSection />
                <FAQSection />
            </main>
            <Footer />
            <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);