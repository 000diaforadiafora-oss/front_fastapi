export type Box = {
  id?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  polygon?: number[];
  confidence?: number;
  class: string;
};

export type DetectResponse = {
  success: boolean;
  cfu_count: number;
  boxes: Box[];
  image_width: number;
  image_height: number;
  annotated_image: string;
};
