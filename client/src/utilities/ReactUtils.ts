import React from 'react';

type ReturnValue<T> = T extends (...params: any[]) => infer U ? U : never;

export function useEffectAsync(callback: () => Promise<void>, cleanup?: ReturnValue<React.EffectCallback>) {
    React.useEffect(() => {
        callback();

        if (cleanup) return cleanup;
    });
}