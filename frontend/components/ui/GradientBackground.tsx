import { MeshGradientView } from "expo-mesh-gradient";
import { COLORS } from "@/constants/colors";

export function GradientBackground() {
  const borderColor = COLORS.background;
  const color_1 = "#ffa3ab";
  // const color_2 = COLORS.orange;
  const color_3 = COLORS.red;
  const meshPoints = [
    [0.0, 0.0],
    [0.25, 0.0],
    [0.5, 0.0],
    [0.75, 0.0],
    [1.0, 0.0],

    [0.0, 0.25],
    [0.25, 0.25],
    [0.5, 0.25],
    [0.75, 0.25],
    [1.0, 0.25],

    [0.0, 0.5],
    [0.25, 0.5],
    [0.5, 0.5],
    [0.75, 0.5],
    [1.0, 0.5],

    [0.0, 0.75],
    [0.25, 0.75],
    [0.5, 0.75],
    [0.75, 0.75],
    [1.0, 0.75],

    [0.0, 1.0],
    [0.25, 1.0],
    [0.5, 1.0],
    [0.75, 1.0],
    [1.0, 1.0],
  ];
  const meshColors = [
    // row 1
    borderColor,
    borderColor,
    borderColor,
    borderColor,
    borderColor,

    // row 2
    borderColor,
    color_1,
    color_3,
    color_1,
    borderColor,

    // row 3
    borderColor,
    color_1,
    color_1,
    color_1,
    borderColor,

    // row 4
    borderColor,
    color_1,
    color_3,
    color_1,
    borderColor,

    // row 5
    borderColor,
    borderColor,
    borderColor,
    borderColor,
    borderColor,
  ];
  return (
    <MeshGradientView
      columns={5}
      rows={5}
      points={meshPoints}
      colors={meshColors}
      style={{
        position: "absolute",
        top: -200,
        right: -120,
        bottom: -250,
        left: -120,
      }}
    />
  );
}
