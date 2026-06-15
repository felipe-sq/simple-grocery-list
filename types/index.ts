export type Store = {
  id: string;
  household_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type Aisle = {
  id: string;
  household_id: string;
  store_id: string;
  name: string;
  sort_order: number;
};
