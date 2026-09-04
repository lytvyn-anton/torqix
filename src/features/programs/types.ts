export type ActiveProgram = {
  id: string;
  name: string;
};

export type Program = {
  id: string;
  name: string;
  status: 'active' | 'archived';
  createdAt: string;
};
