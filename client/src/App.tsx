// Printed Puzzle Desk: 불필요한 프레임을 없애고, 전체 화면의 종이 지면과 퍼즐 보드에만 집중한다.
import GameCanvas from "@/components/GameCanvas";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

function SudokuApp() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="relative h-full w-full">
      <GameCanvas theme={theme} />
      {toggleTheme && (
        <Button
          variant="outline"
          size="icon"
          className={`absolute top-4 right-4 z-50 bg-background/50 backdrop-blur-sm border-0 bg-transparent opacity-70 hover:opacity-100 transition-opacity cursor-pointer ${theme === "dark" ? "text-white" : "text-black"}`}
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
        </Button>
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider switchable defaultTheme="dark">
      <SudokuApp />
    </ThemeProvider>
  );
}

export default App;
