import {
  createScope,
  Scope,
  ScopeConstructorCallback,
  ScopeMethod,
} from "animejs";

import { useEffect, useMemo, useRef } from "react";

type Methods = Record<string, ScopeMethod>;

interface UseAnimeParams<T extends Methods> {
  add?: ScopeConstructorCallback;
  methods?: T;
}

interface TypedScope<T extends Methods> extends Omit<Scope, "methods"> {
  methods: T;
}

export function useAnime<T extends Methods>(
  params: UseAnimeParams<T> = {}
): TypedScope<T> {
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const scope = useMemo(() => {
    const scope = createScope();
    scope.add((self) => {
      if (params.add) {
        self?.add((...args) => {
          paramsRef.current.add?.(...args);
        });
      }
      if (params.methods) {
        Object.entries(params.methods).map(([k]) => {
          self?.add(k, (...args) => {
            if (paramsRef.current.methods?.[k]) {
              paramsRef.current.methods[k](...args);
            }
          });
        });
      }
    });

    return scope;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scopeKeys = Object.keys(params.methods || {});

  useEffect(() => {
    if (params.methods) {
      Object.entries(params.methods).map(([k]) => {
        scope.add(k, (...args) => {
          if (paramsRef.current.methods?.[k]) {
            paramsRef.current.methods[k](...args);
          }
        });
      });
    }

    return () => {
      scope.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, scopeKeys);

  return scope as TypedScope<T>;
}

