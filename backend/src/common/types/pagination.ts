export type PaginationMetadata = {
  page_number: number;
  page_size: number;
  max_page_number: number;
  total_items: number;
};

export type PaginatedData<T> = {
  data: T[];
  pagination: PaginationMetadata;
};
