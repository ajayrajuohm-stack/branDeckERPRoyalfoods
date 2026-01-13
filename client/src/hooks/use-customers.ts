import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export function useCustomers() {
  const queryClient = useQueryClient();

  /* =======================
     LIST
  ======================= */
  const list = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await axios.get("/api/customers");

      // ✅ SAFE NORMALIZATION (fixes UI not updating issue)
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.data)) return res.data.data;

      return [];
    },
  });

  /* =======================
     CREATE
  ======================= */
  const create = useMutation({
    mutationFn: async (data: any) => {
      const res = await axios.post("/api/customers", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  /* =======================
     UPDATE
  ======================= */
  const update = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await axios.put(`/api/customers/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  /* =======================
     DELETE
  ======================= */
  const remove = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  return { list, create, update, remove };
}
