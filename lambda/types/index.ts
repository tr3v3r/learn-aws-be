// { "id": "30", "title": "Electric Toothbrush", "description": "Advanced electric toothbrush for better oral care.", "price": 79.99, "count": 100 }

export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number;
};

export type ProductDTO = {
  createdAt: number;
  id: string;
  title: string;
  description: string;
  price: number;
};

export type StockDTO = {
  createdAt: number;
  product_id: string;
  count: number;
};
