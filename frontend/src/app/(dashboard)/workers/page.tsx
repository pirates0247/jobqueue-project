'use client';

import { useQuery } from '@tanstack/react-query';
import { workerApi } from '@/lib/worker-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Wifi, WifiOff } from 'lucide-react';

export default function WorkersPage() {
  const { data: workers, isLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: () => workerApi.findAll(),
    refetchInterval: 15000,
  });

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Workers</h1>
        <p className="text-sm text-muted-foreground">Monitor registered workers and their status.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {workers?.map((worker) => (
            <Card key={worker.id}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-sm font-medium">{worker.name}</CardTitle>
                    {worker.hostname && (
                      <p className="text-xs text-muted-foreground">{worker.hostname}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    Concurrency: {worker.concurrency}
                  </span>
                  <Badge variant={worker.status === 'ONLINE' ? 'default' : 'secondary'}>
                    {worker.status === 'ONLINE' ? (
                      <Wifi className="mr-1 h-3 w-3" />
                    ) : (
                      <WifiOff className="mr-1 h-3 w-3" />
                    )}
                    {worker.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>ID: <span className="font-mono">{worker.id.slice(0, 8)}</span></span>
                  {worker.lastHeartbeat && (
                    <span>Last heartbeat: {new Date(worker.lastHeartbeat).toLocaleTimeString()}</span>
                  )}
                  <span>Registered: {new Date(worker.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {workers?.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No workers registered yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
