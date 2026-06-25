import { useEffect, useState } from 'react';
import type { Category } from '../type/domain';
import { fetchMenus } from '../services/customerApi';

interface UseMenuResult {
  categories: Category[];
  loading: boolean;
  error: boolean;
}

export function useMenu(): UseMenuResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetchMenus()
      .then((data) => {
        if (active) setCategories(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { categories, loading, error };
}
