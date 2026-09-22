export interface CellPos {
  row: number;
  col: number;
}

export interface ColorDef {
  id: string;
  endpoints: [CellPos, CellPos];
}

export interface Level {
  size: number;
  colors: ColorDef[];
}
