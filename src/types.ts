export type Box = {
  id?: string;
  class: string;
  confidence?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  polygon?: number[];
};

export type DetectResponse = {
  image_id: string;
  boxes: Box[];
  annotated_image?: string;
  success?: boolean;
  cfu_count?: number;
  image_width?: number;
  image_height?: number;
};
