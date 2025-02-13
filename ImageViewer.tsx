import React, { useRef, useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import * as fabric from 'fabric';

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${props => props.theme.colors.background};
`;

const ToolBar = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
`;

const ToolButton = styled.button`
  padding: 6px 12px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background-color: #f0f0f0;
  }
`;

const ActiveToolButton = styled(ToolButton)<{ $active: boolean }>`
  ${props => props.$active && `
    background-color: #007bff;
    color: white;
  `}
`;

const CanvasContainer = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
  min-height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;

  canvas {
    border: 1px solid #ddd;
  }
`;

enum DrawingMode {
  SELECT,
  RECTANGLE,
  CIRCLE,
  FREE_DRAW,
  TEXT
}

interface ImageViewerProps {
  config: {
    url: string;
    parentImageId?: number;
  };
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ config }) => {
  console.log('ImageViewer mounted with config:', config);

  const canvasRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>(DrawingMode.SELECT);
  const [brushColor, setBrushColor] = useState('#ff0000');
  const [brushWidth, setBrushWidth] = useState(3);
  const [textColor, setTextColor] = useState('#000000');
  const [textSize, setTextSize] = useState(24);

  const initCanvas = useCallback(() => {
    if (!containerRef.current) return null;

    const container = containerRef.current;
    const canvas = new fabric.Canvas('image-canvas', {
      selection: true,
      preserveObjectStacking: true
    });

    canvas.setDimensions({
      width: container.clientWidth || 800,
      height: container.clientHeight || 600
    });

    return canvas;
  }, []);

  const loadImage = useCallback((url: string, canvas: fabric.Canvas) => {
    console.log('Loading image:', url);
    setError(null);
    setLoading(true);

    return new Promise((resolve, reject) => {
      const img = new Image();
      imageRef.current = img;
      
      img.onload = () => {
        const container = containerRef.current;
        if (!container) {
          setError('Container not found');
          setLoading(false);
          reject(new Error('Container not found'));
          return;
        }

        canvas.clear();

        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        canvas.setDimensions({ width, height });

        const fabricImage = new fabric.Image(img);

        const scaleX = (width - 40) / fabricImage.width!;
        const scaleY = (height - 40) / fabricImage.height!;
        const scale = Math.min(scaleX, scaleY);

        fabricImage.scale(scale);

        fabricImage.set({
          left: (width - fabricImage.width! * scale) / 2,
          top: (height - fabricImage.height! * scale) / 2
        });

        canvas.add(fabricImage);
        canvas.renderAll();
        setLoading(false);
        resolve(true);
      };

      img.onerror = (err) => {
        console.error('Error loading image:', err);
        setError('Failed to load image');
        setLoading(false);
        reject(err);
      };

      // No need for crossOrigin for local images
      img.src = url;
    });
  }, []);

  useEffect(() => {
    console.log('Effect triggered with URL:', config.url);
    
    if (canvasRef.current) {
      canvasRef.current.dispose();
      canvasRef.current = null;
    }

    if (imageRef.current) {
      imageRef.current.onload = null;
      imageRef.current.onerror = null;
      imageRef.current = null;
    }

    const canvas = initCanvas();
    if (!canvas) {
      setError('Failed to initialize canvas');
      return;
    }

    canvasRef.current = canvas;

    const handleResize = () => {
      const container = containerRef.current;
      if (!container || !canvas) return;

      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;
      canvas.setDimensions({ width, height });
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    loadImage(config.url, canvas).catch(err => {
      console.error('Failed to load image:', err);
      setError('Failed to load image');
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      if (imageRef.current) {
        imageRef.current.onload = null;
        imageRef.current.onerror = null;
      }
      canvas.dispose();
    };
  }, [config.url, initCanvas, loadImage]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.isDrawingMode = drawingMode === DrawingMode.FREE_DRAW;

    if (drawingMode === DrawingMode.FREE_DRAW) {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = brushColor;
      canvas.freeDrawingBrush.width = brushWidth;
    }

    if (drawingMode === DrawingMode.RECTANGLE) {
      canvas.on('mouse:down', startDrawingRectangle);
    } else if (drawingMode === DrawingMode.TEXT) {
      canvas.on('mouse:down', addText);
    } else {
      canvas.off('mouse:down');
    }

    return () => {
      canvas.off('mouse:down');
      canvas.off('mouse:move');
    };
  }, [drawingMode, brushColor, brushWidth, textColor, textSize]);

  const startDrawingRectangle = (options: fabric.IEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pointer = canvas.getPointer(options.e);
    const rect = new fabric.Rect({
      left: pointer.x,
      top: pointer.y,
      width: 0,
      height: 0,
      fill: 'transparent',
      stroke: 'red',
      strokeWidth: 2,
    });

    canvas.add(rect);
    
    canvas.on('mouse:move', (e) => {
      const newPointer = canvas.getPointer(e.e);
      rect.set({
        width: newPointer.x - rect.left!,
        height: newPointer.y - rect.top!,
      });
      canvas.renderAll();
    });

    canvas.once('mouse:up', () => {
      canvas.off('mouse:move');
    });
  };

  const addText = (options: fabric.IEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || drawingMode !== DrawingMode.TEXT) return;

    const pointer = canvas.getPointer(options.e);
    const text = new fabric.Textbox('Cliquez pour éditer', {
      left: pointer.x,
      top: pointer.y,
      fontSize: textSize,
      fill: textColor,
      fontFamily: 'Arial',
      editable: true
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    setDrawingMode(DrawingMode.SELECT);
  };

  const handleRotate = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      activeObject.rotate((activeObject.angle || 0) + angle);
    } else {
      canvas.getObjects().forEach(obj => {
        obj.rotate((obj.angle || 0) + angle);
      });
    }
    canvas.renderAll();
  };

  const handleZoom = (factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const newZoom = zoom * factor;
    if (newZoom > 0.1 && newZoom < 5) {
      canvas.setZoom(newZoom);
      setZoom(newZoom);
    }
  };

  const handleReset = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setZoom(1);
    setZoom(1);
    canvas.getObjects().forEach(obj => {
      obj.setAngle(0);
      obj.center();
    });
    canvas.renderAll();
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' && canvasRef.current) {
      const activeObjects = canvasRef.current.getActiveObjects();
      canvasRef.current.remove(...activeObjects);
      canvasRef.current.discardActiveObject();
      canvasRef.current.requestRenderAll();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.on('key:down', handleKeyDown);
      return () => {
        canvas.off('key:down', handleKeyDown);
      };
    }
  }, [handleKeyDown]);

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !config.parentImageId) return;

    try {
      // Convertir le canvas en base64
      const dataUrl = canvas.toDataURL({
        format: 'png',
        quality: 1
      });

      // Envoyer au serveur
      const response = await fetch('/api/geocaches/images/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parent_image_id: config.parentImageId,
          image_data: dataUrl
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save image');
      }

      const result = await response.json();
      alert('Image sauvegardée avec succès !');
    } catch (error) {
      console.error('Error saving image:', error);
      alert('Erreur lors de la sauvegarde de l\'image');
    }
  };

  return (
    <Container>
      <ToolBar>
        <ActiveToolButton
          $active={drawingMode === DrawingMode.SELECT}
          onClick={() => setDrawingMode(DrawingMode.SELECT)}
        >
          Sélection
        </ActiveToolButton>
        <ActiveToolButton
          $active={drawingMode === DrawingMode.RECTANGLE}
          onClick={() => setDrawingMode(DrawingMode.RECTANGLE)}
        >
          Rectangle
        </ActiveToolButton>
        <ActiveToolButton
          $active={drawingMode === DrawingMode.CIRCLE}
          onClick={() => setDrawingMode(DrawingMode.CIRCLE)}
        >
          Cercle
        </ActiveToolButton>
        <ActiveToolButton
          $active={drawingMode === DrawingMode.FREE_DRAW}
          onClick={() => setDrawingMode(DrawingMode.FREE_DRAW)}
        >
          Dessin libre
        </ActiveToolButton>
        <ActiveToolButton
          $active={drawingMode === DrawingMode.TEXT}
          onClick={() => setDrawingMode(DrawingMode.TEXT)}
        >
          Texte
        </ActiveToolButton>
        <ToolButton onClick={() => handleRotate(-90)}>⟲ Rotation -90°</ToolButton>
        <ToolButton onClick={() => handleRotate(90)}>⟳ Rotation +90°</ToolButton>
        <ToolButton onClick={() => handleZoom(1.2)}>🔍+ Zoom In</ToolButton>
        <ToolButton onClick={() => handleZoom(0.8)}>🔍- Zoom Out</ToolButton>
        <ToolButton onClick={handleReset}>↺ Reset</ToolButton>
        {config.parentImageId && (
          <ToolButton onClick={handleSave}>💾 Sauvegarder</ToolButton>
        )}
        <input
          type="color"
          value={brushColor}
          onChange={(e) => setBrushColor(e.target.value)}
          style={{ width: '40px', height: '40px' }}
        />
        <select
          value={brushWidth}
          onChange={(e) => setBrushWidth(Number(e.target.value))}
        >
          <option value={1}>Fin</option>
          <option value={3}>Moyen</option>
          <option value={5}>Épais</option>
        </select>
        <input
          type="color"
          value={textColor}
          onChange={(e) => setTextColor(e.target.value)}
          style={{ width: '40px', height: '40px' }}
        />
        <select
          value={textSize}
          onChange={(e) => setTextSize(Number(e.target.value))}
        >
          <option value={12}>Petit</option>
          <option value={18}>Moyen</option>
          <option value={24}>Grand</option>
        </select>
      </ToolBar>
      <CanvasContainer ref={containerRef}>
        {loading && <div>Chargement de l'image...</div>}
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <canvas id="image-canvas" />
      </CanvasContainer>
    </Container>
  );
};
