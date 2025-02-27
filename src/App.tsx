import React, { useRef, useState, useEffect, createContext, useContext } from "react";
import { createRoot } from "react-dom/client";



// Theme Context
const ThemeContext = createContext({
  isDarkMode: false,
  toggleTheme: () => {},
});

// Soft Color Palette
const COLORS = {
  light: {
    background: "#F5F0E6",
    surface: "#FAF5EF",
    text: "#3A3A3A",
    border: "#E0D5C1",
    accent: "#8B7D6B",
    toolActive: "#D2C1B0",
  },
  dark: {
    background: "#2C2C2C",
    surface: "#3A3A3A",
    text: "#E0E0E0",
    border: "#4A4A4A",
    accent: "#B19470",
    toolActive: "#5A5A5A",
  },
};

// Shape types and interfaces
interface Shape {
  type: "rectangle" | "circle" | "triangle" | "freehand";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  points?: { x: number; y: number }[];
}

function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function Whiteboard() {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"pen" | "eraser" | "rectangle" | "circle" | "triangle">("pen");
  const [color, setColor] = useState("#000000");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  const theme = isDarkMode ? COLORS.dark : COLORS.light;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    canvas.width = window.innerWidth * 0.9;
    canvas.height = window.innerHeight * 0.7;

    context.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all shapes
    shapes.forEach((shape) => {
      drawShape(context, shape);
    });

    // Draw current freehand path or shape
    if (currentPath.length > 0 && (tool === "pen" || tool === "freehand")) {
      drawCurrentPath(context);
    }
  }, [shapes, currentPath, tool, isDarkMode]);

  const drawShape = (context: CanvasRenderingContext2D, shape: Shape) => {
    context.strokeStyle = shape.color;
    context.lineWidth = 2;

    switch (shape.type) {
      case "rectangle":
        context.strokeRect(shape.x, shape.y, shape.width, shape.height);
        break;
      case "circle":
        context.beginPath();
        context.arc(
          shape.x + shape.width / 2,
          shape.y + shape.height / 2,
          Math.min(shape.width, shape.height) / 2,
          0,
          Math.PI * 2,
        );
        context.stroke();
        break;
      case "triangle":
        context.beginPath();
        context.moveTo(shape.x + shape.width / 2, shape.y);
        context.lineTo(shape.x, shape.y + shape.height);
        context.lineTo(shape.x + shape.width, shape.y + shape.height);
        context.closePath();
        context.stroke();
        break;
      case "freehand":
        if (shape.points) {
          context.beginPath();
          context.moveTo(shape.points[0].x, shape.points[0].y);
          shape.points.forEach(point => context.lineTo(point.x, point.y));
          context.stroke();
        }
        break;
    }
  };

  const drawCurrentPath = (context: CanvasRenderingContext2D) => {
    context.strokeStyle = color;
    context.lineWidth = 2;

    if (tool === "pen" || tool === "freehand") {
      context.beginPath();
      context.moveTo(currentPath[0].x, currentPath[0].y);
      currentPath.forEach(point => context.lineTo(point.x, point.y));
      context.stroke();
    } else if (startPoint && currentPath.length > 0) {
      const endPoint = currentPath[currentPath.length - 1];
      const width = Math.abs(endPoint.x - startPoint.x);
      const height = Math.abs(endPoint.y - startPoint.y);
      const x = Math.min(startPoint.x, endPoint.x);
      const y = Math.min(startPoint.y, endPoint.y);

      switch (tool) {
        case "rectangle":
          context.strokeRect(x, y, width, height);
          break;
        case "circle":
          context.beginPath();
          context.arc(x + width / 2, y + height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
          context.stroke();
          break;
        case "triangle":
          context.beginPath();
          context.moveTo(x + width / 2, y);
          context.lineTo(x, y + height);
          context.lineTo(x + width, y + height);
          context.closePath();
          context.stroke();
          break;
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === "pen") {
      setIsDrawing(true);
      setCurrentPath([{ x, y }]);
    } else if (tool === "eraser") {
      const context = canvas.getContext("2d");
      if (!context) return;

      context.fillStyle = theme.background;
      context.beginPath();
      context.arc(x, y, 10, 0, Math.PI * 2);
      context.fill();
    } else {
      // For shape tools
      setIsDrawing(true);
      setStartPoint({ x, y });
      setCurrentPath([{ x, y }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const context = canvas.getContext("2d");
    if (!context) return;

    if (tool === "pen") {
      setCurrentPath(prev => [...prev, { x, y }]);
    } else if (tool === "eraser") {
      context.fillStyle = theme.background;
      context.beginPath();
      context.arc(x, y, 10, 0, Math.PI * 2);
      context.fill();
    } else {
      // For shape tools
      setCurrentPath(prev => [...prev, { x, y }]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;

    if ((tool === "pen" || tool === "freehand") && currentPath.length > 0) {
      const newShape: Shape = {
        type: "freehand",
        x: 0,
        y: 0,
        width: Math.max(...currentPath.map(p => p.x)) - Math.min(...currentPath.map(p => p.x)),
        height: Math.max(...currentPath.map(p => p.y)) - Math.min(...currentPath.map(p => p.y)),
        color: color,
        points: currentPath,
      };
      setShapes(prev => [...prev, newShape]);
    } else if (
      startPoint && currentPath.length > 0 && (tool === "rectangle" || tool === "circle" || tool === "triangle")
    ) {
      const endPoint = currentPath[currentPath.length - 1];
      const width = Math.abs(endPoint.x - startPoint.x);
      const height = Math.abs(endPoint.y - startPoint.y);
      const x = Math.min(startPoint.x, endPoint.x);
      const y = Math.min(startPoint.y, endPoint.y);

      const newShape: Shape = {
        type: tool,
        x,
        y,
        width,
        height,
        color: color,
      };
      setShapes(prev => [...prev, newShape]);
    }

    setIsDrawing(false);
    setCurrentPath([]);
    setStartPoint(null);
  };

  const buttonStyle = (activeTool: string) => ({
    backgroundColor: tool === activeTool ? theme.toolActive : theme.surface,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    padding: "5px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  });

  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "20px",
        backgroundColor: theme.background,
        color: theme.text,
        transition: "all 0.3s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: "10px",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", gap: "5px" }}>
          <button
            onClick={() => setTool("pen")}
            style={buttonStyle("pen")}
          >
            ✏️ Pen
          </button>
          <button
            onClick={() => setTool("eraser")}
            style={buttonStyle("eraser")}
          >
            🧽 Eraser
          </button>
          <button
            onClick={() => setTool("rectangle")}
            style={buttonStyle("rectangle")}
          >
            🟥 Rectangle
          </button>
          <button
            onClick={() => setTool("circle")}
            style={buttonStyle("circle")}
          >
            ⭕ Circle
          </button>
          <button
            onClick={() => setTool("triangle")}
            style={buttonStyle("triangle")}
          >
            🔺 Triangle
          </button>
        </div>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{
            width: "50px",
            height: "30px",
            border: `1px solid ${theme.border}`,
            borderRadius: "6px",
            backgroundColor: theme.surface,
          }}
        />
        <button
          onClick={() => setShapes([])}
          style={{
            ...buttonStyle(""),
            backgroundColor: theme.surface,
          }}
        >
          🗑️ Clear
        </button>
        <button
          onClick={toggleTheme}
          style={{
            ...buttonStyle(""),
            backgroundColor: theme.surface,
          }}
        >
          {isDarkMode ? "☀️" : "🌙"}
        </button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (isDrawing) {
            handleMouseUp();
          }
        }}
        style={{
          border: `2px solid ${theme.border}`,
          backgroundColor: theme.surface,
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          borderRadius: "8px",
          cursor: tool === "eraser" ? "cell" : "crosshair",
          width: "100%",
          maxHeight: "70vh",
          transition: "all 0.3s ease",
        }}
      />
      <div
        style={{
          textAlign: "center",
          marginTop: "10px",
          fontSize: "0.8em",
          color: theme.accent,
        }}
      >
        <a
          href={import.meta.url.replace("esm.town", "val.town")}
          target="_top"
          style={{ color: theme.accent, textDecoration: "none" }}
        >
          View Source
        </a>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Whiteboard />
    </ThemeProvider>
  );
}
export default App;
