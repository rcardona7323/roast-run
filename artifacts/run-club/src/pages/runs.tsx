import { useState } from "react";
import { useListMyRuns, useDeleteRun, getListMyRunsQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { History, Trash2, Calendar, MapPin, Footprints, Loader2, Pencil, Activity } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link } from "wouter";

type Run = {
  id: number;
  distanceMiles: number;
  date: string;
  notes?: string | null;
  source?: string | null;
  stravaActivityId?: string | null;
  clubEventId?: number | null;
};

export default function Runs() {
  const queryClient = useQueryClient();
  const { data: runs, isLoading, isError } = useListMyRuns({
    query: { queryKey: getListMyRunsQueryKey() }
  });

  const deleteMutation = useDeleteRun();
  const [editRun, setEditRun] = useState<Run | null>(null);
  const [editDistance, setEditDistance] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ runId: id }, {
      onSuccess: () => {
        toast.success("Run deleted");
        queryClient.invalidateQueries({ queryKey: getListMyRunsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      },
      onError: () => {
        toast.error("Failed to delete run");
      }
    });
  };

  const openEdit = (run: Run) => {
    setEditRun(run);
    setEditDistance(String(run.distanceMiles));
    setEditDate(run.date);
    setEditNotes(run.notes ?? "");
  };

  const handleEditSave = async () => {
    if (!editRun) return;
    const distance = parseFloat(editDistance);
    if (isNaN(distance) || distance <= 0) {
      toast.error("Distance must be a positive number");
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/runs/${editRun.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ distanceMiles: distance, date: editDate, notes: editNotes || null }),
      });
      if (!res.ok) throw new Error();
      toast.success("Run updated");
      setEditRun(null);
      queryClient.invalidateQueries({ queryKey: getListMyRunsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    } catch {
      toast.error("Failed to update run");
    } finally {
      setEditSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-10 w-48 mb-6" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-destructive font-medium">Failed to load run history.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight flex items-center gap-3">
            <History className="w-8 h-8 text-primary" /> Run History
          </h1>
          <p className="text-muted-foreground mt-2">All your logged miles in one place.</p>
        </div>
        <Button asChild className="rounded-full shadow-sm">
          <Link href="/log-run"><Footprints className="w-4 h-4 mr-2" /> Log a New Run</Link>
        </Button>
      </div>

      {!runs || runs.length === 0 ? (
        <Card className="border-dashed bg-muted/20 border-border shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-muted p-5 rounded-full mb-6 text-muted-foreground">
              <MapPin className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold font-serif mb-2">The road is waiting</h3>
            <p className="text-muted-foreground mb-8 max-w-md">
              You haven't logged any runs yet. Start moving to build your history and earn rewards.
            </p>
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/log-run">Log Your First Run</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {runs.map((run) => (
            <Card key={run.id} className="overflow-hidden hover:border-primary/30 transition-colors">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                  <div className="bg-muted/50 p-4 sm:w-32 flex sm:flex-col items-center justify-center gap-2 sm:gap-0 border-b sm:border-b-0 sm:border-r border-border">
                    <Calendar className="w-4 h-4 text-muted-foreground sm:hidden" />
                    <span className="text-sm font-medium text-muted-foreground uppercase">{format(new Date(run.date), "MMM")}</span>
                    <span className="text-2xl sm:text-3xl font-bold font-serif">{format(new Date(run.date), "d")}</span>
                    <span className="text-xs text-muted-foreground mt-1 hidden sm:block">{format(new Date(run.date), "yyyy")}</span>
                  </div>
                  <div className="flex-1 p-5 flex flex-col justify-center">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-end gap-2 mb-2 flex-wrap">
                          <span className="text-3xl font-bold font-serif text-primary leading-none">{run.distanceMiles}</span>
                          <span className="text-lg font-medium text-muted-foreground leading-none mb-1">miles</span>
                          {run.source === "strava" ? (
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-[#FC4C02]/10 text-[#FC4C02] border-[#FC4C02]/30 rounded-full font-medium">
                              <Activity className="w-2.5 h-2.5" /> Strava
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 rounded-full text-muted-foreground">
                              Manual
                            </Badge>
                          )}
                          {run.clubEventId != null && (
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-primary/10 text-primary border-primary/30 rounded-full font-medium">
                              <MapPin className="w-2.5 h-2.5" /> Club Run
                            </Badge>
                          )}
                        </div>
                        {run.notes && (
                          <p className="text-muted-foreground mt-2 max-w-xl italic">"{run.notes}"</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 -mt-2 -mr-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => openEdit(run)}
                        >
                          <Pencil className="w-4 h-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this run?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove {run.distanceMiles} miles from your total. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(run.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editRun} onOpenChange={(open) => { if (!open) setEditRun(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Run</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-distance">Distance (miles)</Label>
              <Input
                id="edit-distance"
                type="number"
                step="0.1"
                min="0.1"
                value={editDistance}
                onChange={(e) => setEditDistance(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">Notes (optional)</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="How did it go?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRun(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
