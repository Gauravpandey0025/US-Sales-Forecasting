import { useEffect, useState } from "react";
import { loadModel } from "@/lib/model";

type ModelState = {
  model: Awaited<ReturnType<typeof loadModel>> | null;
  loading: boolean;
  error: string | null;
};

export function useModel(): ModelState {
  const [state, setState] = useState<ModelState>({ model: null, loading: true, error: null });

  useEffect(() => {
    let alive = true;
    loadModel()
      .then((model) => {
        if (alive) setState({ model, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (alive) setState({ model: null, loading: false, error: err.message });
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
