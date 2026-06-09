import { useState, useEffect, useRef } from "react";
import { 
  useListMembers, 
  useListAllRedemptions, 
  useUpdateRedemptionStatus, 
  useListRewardTiers, 
  useCreateRewardTier, 
  useUpdateRewardTier, 
  useDeleteRewardTier,
  useGetAdminMemberDetail,
  useAdminUpdateMember,
  useListClubEvents,
  useCreateClubEvent,
  useUpdateClubEvent,
  useDeleteClubEvent,
  getGetAdminMemberDetailQueryKey,
  getListMembersQueryKey,
  getListAllRedemptionsQueryKey,
  getListRewardTiersQueryKey,
  getListClubEventsQueryKey,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Settings, Gift, Edit, Trash2, Plus, Check, X, ShieldAlert, Footprints, Loader2, Pencil, Upload, Download, AlertCircle, CheckCircle2, GitMerge, Star, ArrowRight, Phone, PhoneCall, Trophy, User, ChevronRight, Mail, Activity, CalendarDays } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

const rewardTierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  milesRequired: z.coerce.number().min(0.1, "Must be greater than 0"),
  rewardType: z.enum(['coffee', 'smoothie', 'apparel', 'custom']),
  active: z.boolean().default(true)
});

type AdminRun = {
  id: number;
  userId: string;
  distanceMiles: number;
  date: string;
  notes?: string | null;
  createdAt: string;
  source?: string | null;
  stravaActivityId?: string | null;
  memberDisplayName?: string | null;
  memberEmail?: string | null;
};

export default function Admin() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("redemptions");
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [editingTierId, setEditingTierId] = useState<number | null>(null);

  const [adminRuns, setAdminRuns] = useState<AdminRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [editRun, setEditRun] = useState<AdminRun | null>(null);
  const [editDistance, setEditDistance] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deletingRunId, setDeletingRunId] = useState<number | null>(null);
  const [runsSourceFilter, setRunsSourceFilter] = useState<"all" | "manual" | "strava">("all");
  const [memberDetailSourceFilter, setMemberDetailSourceFilter] = useState<"all" | "manual" | "strava">("all");

  // CSV import state
  type CsvRow = { email: string; displayName: string; date: string; miles: string; phone: string; emergencyContact: string; notes: string; _error?: string };
  type ImportResult = { row: number; email: string; status: "imported" | "error"; message?: string };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ imported: number; errors: number; results: ImportResult[] } | null>(null);

  // Club events state
  const { data: clubEvents, refetch: refetchEvents } = useListClubEvents({
    query: { queryKey: getListClubEventsQueryKey() }
  });
  const createEventMutation = useCreateClubEvent();
  const updateEventMutation = useUpdateClubEvent();
  const deleteEventMutation = useDeleteClubEvent();
  const [eventForm, setEventForm] = useState({ name: "", date: "", description: "" });
  const [eventFormSaving, setEventFormSaving] = useState(false);
  const [editingEvent, setEditingEvent] = useState<{ id: number; name: string; date: string; description: string } | null>(null);
  const [editEventSaving, setEditEventSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const SAMPLE_CSV = [
    "date,name,email,phone,emergency_contact,miles",
    `${today},John Smith,john@example.com,555-100-0001,Jane Smith 555-100-0002,5.2`,
    `${today},Jane Doe,jane@example.com,555-200-0001,Bob Doe 555-200-0002,3.1`,
  ].join("\n");

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): CsvRow[] => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[\s-]/g, "_").replace(/[^a-z_]/g, ""));
    const col = (aliases: string[]) => headers.findIndex(h => aliases.includes(h));
    const emailIdx = col(["email"]);
    const nameIdx = col(["name", "display_name", "displayname"]);
    const dateIdx = col(["date"]);
    const milesIdx = col(["miles", "distance_miles", "distance"]);
    const phoneIdx = col(["phone", "phone_number", "phonenumber"]);
    const ecIdx = col(["emergency_contact", "emergencycontact", "emergency", "ec"]);
    const notesIdx = col(["notes"]);
    return lines.slice(1).map(line => {
      // Handle quoted fields (e.g. "Smith, Jane 555-0001")
      const parts: string[] = [];
      let cur = "", inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === "," && !inQ) { parts.push(cur.trim()); cur = ""; }
        else { cur += ch; }
      }
      parts.push(cur.trim());
      const g = (i: number) => (i >= 0 ? parts[i] ?? "" : "").trim();
      const email = g(emailIdx);
      const displayName = g(nameIdx);
      const date = g(dateIdx) || today;
      const miles = g(milesIdx);
      const phone = g(phoneIdx);
      const emergencyContact = g(ecIdx);
      const notes = g(notesIdx);
      let _error = "";
      if (!email) _error = "Missing email";
      else if (!miles || isNaN(Number(miles)) || Number(miles) <= 0) _error = "Invalid miles";
      else if (date && !date.match(/^\d{4}-\d{2}-\d{2}$/)) _error = "Date must be YYYY-MM-DD";
      return { email, displayName, date, miles, phone, emergencyContact, notes, _error };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setImportResults(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvRows(parseCSV(text));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const validRows = csvRows.filter(r => !r._error);
    if (validRows.length === 0) { toast.error("No valid rows to import"); return; }
    setImporting(true);
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRows.map(r => ({
            email: r.email,
            displayName: r.displayName || undefined,
            date: r.date,
            miles: Number(r.miles),
            phone: r.phone || undefined,
            emergencyContact: r.emergencyContact || undefined,
            notes: r.notes || undefined,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setImportResults(data);
      toast.success(`Imported ${data.imported} run${data.imported !== 1 ? "s" : ""}`);
      queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      if (activeTab === "runs") fetchAdminRuns();
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setCsvRows([]);
    setCsvFileName("");
    setImportResults(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Bonus miles state
  type MemberRow = { id: number; userId: string; displayName: string; email?: string | null; totalMiles: number; isAdmin: boolean; joinedAt: string; profileImageUrl?: string | null };
  const [bonusMember, setBonusMember] = useState<MemberRow | null>(null);
  const [bonusMiles, setBonusMiles] = useState("");
  const [bonusDate, setBonusDate] = useState(new Date().toISOString().split("T")[0]);
  const [bonusNotes, setBonusNotes] = useState("");
  const [bonusSaving, setBonusSaving] = useState(false);

  const openBonus = (member: MemberRow) => {
    setBonusMember(member);
    setBonusMiles("");
    setBonusDate(new Date().toISOString().split("T")[0]);
    setBonusNotes("");
  };

  const handleBonus = async () => {
    if (!bonusMember) return;
    const miles = Number(bonusMiles);
    if (!miles || miles <= 0) { toast.error("Enter a valid miles amount"); return; }
    setBonusSaving(true);
    try {
      const res = await fetch("/api/admin/bonus-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: bonusMember.userId,
          distanceMiles: miles,
          date: bonusDate,
          notes: bonusNotes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${miles} bonus miles added for ${bonusMember.displayName}`);
      setBonusMember(null);
      queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      if (activeTab === "runs") fetchAdminRuns();
    } catch {
      toast.error("Failed to add bonus miles");
    } finally {
      setBonusSaving(false);
    }
  };

  // Weekly digest
  const [digestSending, setDigestSending] = useState(false);
  const handleSendDigest = async () => {
    setDigestSending(true);
    try {
      const res = await fetch("/api/admin/send-weekly-digest", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Weekly digest sent!`, { description: `${data.sent} emails delivered, ${data.skipped} skipped (no email address).` });
      } else {
        toast.error("Failed to send digest", { description: data.error });
      }
    } catch {
      toast.error("Network error sending weekly digest");
    } finally {
      setDigestSending(false);
    }
  };

  // Test email
  const [testEmailSending, setTestEmailSending] = useState(false);
  const handleTestEmail = async () => {
    setTestEmailSending(true);
    try {
      const res = await fetch("/api/admin/test-email", { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Test email sent to ${data.sentTo}`, { description: "Check your inbox." });
      } else {
        const errMsg = data.resend?.message ?? data.resend?.name ?? JSON.stringify(data.resend);
        toast.error(`Resend error (${data.status})`, { description: errMsg, duration: 12000 });
        console.error("Resend response:", data);
      }
    } catch (err) {
      toast.error("Network error calling test-email endpoint");
    } finally {
      setTestEmailSending(false);
    }
  };

  // Member detail sheet
  const [detailUserId, setDetailUserId] = useState<string>("");
  const [detailOpen, setDetailOpen] = useState(false);

  // Member edit mode (inside detail sheet)
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [editMemberFields, setEditMemberFields] = useState({ displayName: "", email: "", phone: "", emergencyContact: "", emergencyPhone: "" });
  const adminUpdateMember = useAdminUpdateMember();

  const startEditMember = () => {
    if (!memberDetail) return;
    const m = memberDetail.member as any;
    setEditMemberFields({
      displayName: m.displayName ?? "",
      email: m.email ?? "",
      phone: m.phone ?? "",
      emergencyContact: m.emergencyContact ?? "",
      emergencyPhone: m.emergencyPhone ?? "",
    });
    setIsEditingMember(true);
  };

  const cancelEditMember = () => setIsEditingMember(false);

  const saveEditMember = async () => {
    if (!memberDetail) return;
    try {
      await adminUpdateMember.mutateAsync({ userId: memberDetail.member.userId, data: { ...editMemberFields } });
      queryClient.invalidateQueries({ queryKey: getGetAdminMemberDetailQueryKey(memberDetail.member.userId) });
      queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      setIsEditingMember(false);
      toast.success("Member updated");
    } catch {
      toast.error("Failed to save changes");
    }
  };

  // Merge members state
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergePrimaryId, setMergePrimaryId] = useState("");
  const [mergeSecondaryId, setMergeSecondaryId] = useState("");
  const [mergeSaving, setMergeSaving] = useState(false);

  const handleMerge = async () => {
    if (!mergePrimaryId || !mergeSecondaryId) { toast.error("Select both members"); return; }
    setMergeSaving(true);
    try {
      const res = await fetch("/api/admin/members/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryUserId: mergePrimaryId, secondaryUserId: mergeSecondaryId }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(`Merged ${mergeSecondary?.displayName} → ${mergePrimary?.displayName}`);
      setMergeDialogOpen(false);
      setMergePrimaryId("");
      setMergeSecondaryId("");
      queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
    } catch (err: any) {
      toast.error(err.message || "Merge failed");
    } finally {
      setMergeSaving(false);
    }
  };

  const { data: members, isLoading: membersLoading } = useListMembers({
    query: { queryKey: getListMembersQueryKey() }
  });

  const { data: redemptions, isLoading: redemptionsLoading } = useListAllRedemptions({
    query: { queryKey: getListAllRedemptionsQueryKey() }
  });

  const { data: tiers, isLoading: tiersLoading } = useListRewardTiers({
    query: { queryKey: getListRewardTiersQueryKey() }
  });

  const { data: memberDetail, isLoading: memberDetailLoading } = useGetAdminMemberDetail(detailUserId, {
    query: { queryKey: getGetAdminMemberDetailQueryKey(detailUserId), enabled: !!detailUserId && detailOpen }
  });

  const mergePrimary = (members as MemberRow[] | undefined)?.find(m => m.userId === mergePrimaryId);
  const mergeSecondary = (members as MemberRow[] | undefined)?.find(m => m.userId === mergeSecondaryId);

  const updateRedemption = useUpdateRedemptionStatus();
  const createTier = useCreateRewardTier();
  const updateTier = useUpdateRewardTier();
  const deleteTier = useDeleteRewardTier();

  const fetchAdminRuns = async () => {
    setRunsLoading(true);
    try {
      const res = await fetch("/api/admin/runs");
      if (!res.ok) throw new Error();
      setAdminRuns(await res.json());
    } catch {
      toast.error("Failed to load runs");
    } finally {
      setRunsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "runs") fetchAdminRuns();
  }, [activeTab]);

  const handleRedemptionStatus = (id: number, status: 'approved' | 'rejected') => {
    updateRedemption.mutate(
      { redemptionId: id, data: { status } },
      {
        onSuccess: () => {
          toast.success(`Redemption ${status}`);
          queryClient.invalidateQueries({ queryKey: getListAllRedemptionsQueryKey() });
        },
        onError: () => toast.error("Failed to update status")
      }
    );
  };

  const form = useForm<z.infer<typeof rewardTierSchema>>({
    resolver: zodResolver(rewardTierSchema),
    defaultValues: { name: "", description: "", milesRequired: 10, rewardType: "coffee", active: true }
  });

  const onTierSubmit = (values: z.infer<typeof rewardTierSchema>) => {
    if (editingTierId) {
      updateTier.mutate({ tierId: editingTierId, data: values }, {
        onSuccess: () => {
          toast.success("Tier updated");
          setTierDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: getListRewardTiersQueryKey() });
        }
      });
    } else {
      createTier.mutate({ data: values }, {
        onSuccess: () => {
          toast.success("Tier created");
          setTierDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: getListRewardTiersQueryKey() });
        }
      });
    }
  };

  const openEditTier = (tier: any) => {
    setEditingTierId(tier.id);
    form.reset({ name: tier.name, description: tier.description, milesRequired: tier.milesRequired, rewardType: tier.rewardType, active: tier.active });
    setTierDialogOpen(true);
  };

  const openCreateTier = () => {
    setEditingTierId(null);
    form.reset({ name: "", description: "", milesRequired: 10, rewardType: "coffee", active: true });
    setTierDialogOpen(true);
  };

  const openEditRun = (run: AdminRun) => {
    setEditRun(run);
    setEditDistance(String(run.distanceMiles));
    setEditDate(run.date);
    setEditNotes(run.notes ?? "");
  };

  const handleEditRunSave = async () => {
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
      fetchAdminRuns();
      queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
    } catch {
      toast.error("Failed to update run");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteRun = async (runId: number) => {
    setDeletingRunId(runId);
    try {
      const res = await fetch(`/api/runs/${runId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Run deleted");
      setAdminRuns((prev) => prev.filter((r) => r.id !== runId));
      queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
    } catch {
      toast.error("Failed to delete run");
    } finally {
      setDeletingRunId(null);
    }
  };

  if (membersLoading || redemptionsLoading || tiersLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-10 w-48"/><Skeleton className="h-64"/></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold font-serif tracking-tight flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" /> Admin Panel
        </h1>
        <p className="text-muted-foreground mt-2">Manage the club, redemptions, and rewards.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-6 h-12">
          <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
          <TabsTrigger value="tiers">Reward Tiers</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="runs">All Runs</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="import">Import CSV</TabsTrigger>
        </TabsList>

        {/* Redemptions */}
        <TabsContent value="redemptions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pending & Recent Redemptions</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSendDigest} disabled={digestSending}>
                  {digestSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                  Send Weekly Digest
                </Button>
                <Button variant="outline" size="sm" onClick={handleTestEmail} disabled={testEmailSending}>
                  {testEmailSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                  Test Email
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {redemptions?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No redemption requests yet.</p>
              ) : (
                <div className="space-y-4">
                  {redemptions?.map((r) => (
                    <div key={r.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-xl gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-lg">{r.memberDisplayName}</span>
                          <span className="text-muted-foreground text-sm">({r.memberEmail})</span>
                        </div>
                        <p className="font-medium font-serif text-primary">{r.rewardTierName}</p>
                        <p className="text-xs text-muted-foreground mt-1">Requested: {format(new Date(r.createdAt), "PPp")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {r.status === 'pending' ? (
                          <>
                            <Button size="sm" onClick={() => handleRedemptionStatus(r.id, 'approved')} className="bg-green-600 hover:bg-green-700 text-white">
                              <Check className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRedemptionStatus(r.id, 'rejected')}>
                              <X className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </>
                        ) : (
                          <Badge variant={r.status === 'approved' ? "default" : "destructive"} className="uppercase">{r.status}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reward Tiers */}
        <TabsContent value="tiers" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
              <Button onClick={openCreateTier}><Plus className="w-4 h-4 mr-2" /> New Reward Tier</Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTierId ? "Edit Tier" : "Create Reward Tier"}</DialogTitle>
                  <DialogDescription>Define what members can unlock with their miles.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onTierSubmit)} className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="milesRequired" render={({ field }) => (
                        <FormItem><FormLabel>Miles Required</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="rewardType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="coffee">Coffee</SelectItem>
                              <SelectItem value="smoothie">Smoothie</SelectItem>
                              <SelectItem value="apparel">Apparel</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                    <Button type="submit" className="w-full">Save Tier</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tiers?.map(tier => (
              <Card key={tier.id} className={!tier.active ? "opacity-60" : ""}>
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div>
                    <p className="font-bold font-serif text-xl mb-1">{tier.name}</p>
                    <Badge variant="secondary">{tier.milesRequired} mi</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditTier(tier)}><Edit className="w-4 h-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Tier?</AlertDialogTitle>
                          <AlertDialogDescription>Are you sure you want to delete '{tier.name}'?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteTier.mutate({ tierId: tier.id }, { onSuccess: () => { toast.success("Tier deleted"); queryClient.invalidateQueries({ queryKey: getListRewardTiersQueryKey() }); } })} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{tier.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Members */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>All Members</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setMergeDialogOpen(true)}>
                <GitMerge className="w-4 h-4 mr-2" /> Merge Members
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {(members as MemberRow[] | undefined)?.map(member => (
                  <div key={member.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={member.profileImageUrl || undefined} />
                        <AvatarFallback>{member.displayName.substring(0,2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold font-serif">{member.displayName}</p>
                          {member.isAdmin && <Badge variant="outline" className="text-[10px] py-0"><ShieldAlert className="w-3 h-3 mr-1"/> Admin</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-lg">{member.totalMiles.toFixed(1)} mi</p>
                        <p className="text-xs text-muted-foreground">Joined {format(new Date(member.joinedAt), "MMM yyyy")}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openBonus(member)}>
                        <Star className="w-3.5 h-3.5 mr-1.5" /> Bonus
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setDetailUserId(member.userId); setDetailOpen(true); setMemberDetailSourceFilter("all"); }}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Runs */}
        <TabsContent value="runs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="flex items-center gap-2">
                  <Footprints className="w-5 h-5" /> All Member Runs
                </CardTitle>
                <Select value={runsSourceFilter} onValueChange={(v) => setRunsSourceFilter(v as typeof runsSourceFilter)}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    <SelectItem value="manual">Manual only</SelectItem>
                    <SelectItem value="strava">Strava only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {runsLoading ? (
                <div className="p-6 space-y-3">
                  {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
                </div>
              ) : adminRuns.filter(r => runsSourceFilter === "all" || r.source === runsSourceFilter).length === 0 ? (
                <p className="text-muted-foreground text-center py-12">No runs logged yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {adminRuns
                    .filter(r => runsSourceFilter === "all" || r.source === runsSourceFilter)
                    .map((run) => (
                    <div key={run.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="text-center w-12">
                          <p className="text-xs text-muted-foreground uppercase">{format(new Date(run.date), "MMM")}</p>
                          <p className="text-xl font-bold font-serif leading-none">{format(new Date(run.date), "d")}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">
                              <span className="text-primary font-bold">{run.distanceMiles} mi</span>
                              <span className="text-muted-foreground text-sm ml-2">— {run.memberDisplayName}</span>
                            </p>
                            {run.source === "strava" ? (
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-[#FC4C02]/10 text-[#FC4C02] border-[#FC4C02]/30 rounded-full font-medium">
                                <Activity className="w-2.5 h-2.5" /> Strava
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5 rounded-full text-muted-foreground">
                                Manual
                              </Badge>
                            )}
                          </div>
                          {run.notes && <p className="text-xs text-muted-foreground italic mt-0.5">"{run.notes}"</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => openEditRun(run)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" disabled={deletingRunId === run.id}>
                              {deletingRunId === run.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this run?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This removes {run.distanceMiles} miles logged by {run.memberDisplayName}. Their total will be updated automatically.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteRun(run.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Club Events */}
        <TabsContent value="events" className="space-y-6">
          {/* Schedule new event */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" /> Schedule a Club Run
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Event Name</Label>
                  <Input
                    placeholder="e.g. Friday Morning Run"
                    value={eventForm.name}
                    onChange={e => setEventForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={eventForm.date}
                    onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Notes (optional)</Label>
                  <Input
                    placeholder="e.g. Meet at the café at 9am"
                    value={eventForm.description}
                    onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                disabled={eventFormSaving || !eventForm.name.trim() || !eventForm.date}
                onClick={async () => {
                  setEventFormSaving(true);
                  try {
                    await createEventMutation.mutateAsync({
                      data: { name: eventForm.name, date: eventForm.date, description: eventForm.description || undefined }
                    });
                    setEventForm({ name: "", date: "", description: "" });
                    queryClient.invalidateQueries({ queryKey: getListClubEventsQueryKey() });
                    toast.success("Event scheduled!");
                  } catch {
                    toast.error("Failed to create event");
                  } finally {
                    setEventFormSaving(false);
                  }
                }}
              >
                {eventFormSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Schedule Event
              </Button>
            </CardContent>
          </Card>

          {/* Event list */}
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Events</CardTitle>
            </CardHeader>
            <CardContent>
              {!clubEvents || clubEvents.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CalendarDays className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No events scheduled yet. Add your first run club event above.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {clubEvents.map(event => (
                    <div key={event.id} className="flex items-center gap-4 py-3">
                      <div className="bg-primary/10 text-primary rounded-xl w-12 h-12 flex flex-col items-center justify-center shrink-0 text-center">
                        <span className="text-[10px] font-bold uppercase leading-none">{format(new Date(event.date + "T12:00:00"), "MMM")}</span>
                        <span className="text-lg font-bold leading-tight">{format(new Date(event.date + "T12:00:00"), "d")}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{event.name}</p>
                        {event.description && <p className="text-xs text-muted-foreground truncate">{event.description}</p>}
                        <p className="text-xs text-muted-foreground">{format(new Date(event.date + "T12:00:00"), "EEEE, MMMM d, yyyy")}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary"
                          onClick={() => setEditingEvent({
                            id: event.id,
                            name: event.name,
                            date: event.date,
                            description: event.description ?? ""
                          })}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{event.name}" on {format(new Date(event.date + "T12:00:00"), "MMMM d")} will be removed. Any runs already tagged to this event will remain but lose their club event link.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={async () => {
                                  try {
                                    await deleteEventMutation.mutateAsync({ eventId: event.id });
                                    queryClient.invalidateQueries({ queryKey: getListClubEventsQueryKey() });
                                    toast.success("Event deleted");
                                  } catch {
                                    toast.error("Failed to delete event");
                                  }
                                }}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import CSV */}
        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Import Runs from CSV</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Upload a CSV to bulk-import runs for members. New members (by email) will be created automatically and linked when they first log in.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Format guide */}
              <div className="bg-muted/40 rounded-xl p-4 border border-border">
                <p className="text-sm font-semibold mb-2">Required columns:</p>
                <code className="text-xs text-muted-foreground block mb-3">email, miles, date (YYYY-MM-DD)</code>
                <p className="text-sm font-semibold mb-2">Optional columns:</p>
                <code className="text-xs text-muted-foreground block mb-3">name, phone, emergency_contact, notes</code>
                <p className="text-xs text-muted-foreground mb-3">Columns can be in any order. Emergency contact can be quoted if it contains a comma (e.g. <span className="font-mono">"Smith, Jane 555-0001"</span>).</p>
                <Button variant="outline" size="sm" onClick={downloadSample}>
                  <Download className="w-4 h-4 mr-2" /> Download Template
                </Button>
              </div>

              {/* File upload */}
              {!csvRows.length && !importResults && (
                <div
                  className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">Click to upload a CSV file</p>
                  <p className="text-sm text-muted-foreground mt-1">or drag and drop</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              )}

              {/* Preview table */}
              {csvRows.length > 0 && !importResults && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{csvFileName} — {csvRows.length} row{csvRows.length !== 1 ? "s" : ""} detected</p>
                    <div className="flex gap-2">
                      <span className="text-xs text-green-600 font-medium">{csvRows.filter(r => !r._error).length} valid</span>
                      {csvRows.some(r => r._error) && (
                        <span className="text-xs text-destructive font-medium">{csvRows.filter(r => r._error).length} invalid</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="overflow-x-auto max-h-72 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">#</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Date</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Name</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Email</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Phone</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Emergency Contact</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Miles</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {csvRows.map((row, i) => (
                            <tr key={i} className={row._error ? "bg-destructive/5" : ""}>
                              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                              <td className="px-3 py-2">{row.date}</td>
                              <td className="px-3 py-2">{row.displayName || "—"}</td>
                              <td className="px-3 py-2">{row.email}</td>
                              <td className="px-3 py-2 text-muted-foreground">{row.phone || "—"}</td>
                              <td className="px-3 py-2 text-muted-foreground">{row.emergencyContact || "—"}</td>
                              <td className="px-3 py-2 font-medium text-primary">{row.miles}</td>
                              <td className="px-3 py-2">
                                {row._error ? (
                                  <span className="flex items-center gap-1 text-destructive text-xs"><AlertCircle className="w-3.5 h-3.5" />{row._error}</span>
                                ) : (
                                  <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle2 className="w-3.5 h-3.5" />Ready</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={resetImport}>Choose Different File</Button>
                    <Button
                      onClick={handleImport}
                      disabled={importing || csvRows.filter(r => !r._error).length === 0}
                    >
                      {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Import {csvRows.filter(r => !r._error).length} Run{csvRows.filter(r => !r._error).length !== 1 ? "s" : ""}
                    </Button>
                  </div>
                </div>
              )}

              {/* Results */}
              {importResults && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-green-700">{importResults.imported}</p>
                      <p className="text-sm text-green-600 mt-1">Successfully imported</p>
                    </div>
                    <div className={`${importResults.errors > 0 ? "bg-destructive/5 border-destructive/20" : "bg-muted border-border"} border rounded-xl p-4 text-center`}>
                      <p className={`text-3xl font-bold ${importResults.errors > 0 ? "text-destructive" : "text-muted-foreground"}`}>{importResults.errors}</p>
                      <p className={`text-sm mt-1 ${importResults.errors > 0 ? "text-destructive/80" : "text-muted-foreground"}`}>Errors</p>
                    </div>
                  </div>
                  {importResults.errors > 0 && (
                    <div className="rounded-xl border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Row</th>
                            <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Email</th>
                            <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {importResults.results.filter(r => r.status === "error").map((r) => (
                            <tr key={r.row} className="bg-destructive/5">
                              <td className="px-4 py-2 text-muted-foreground">{r.row}</td>
                              <td className="px-4 py-2">{r.email}</td>
                              <td className="px-4 py-2 text-destructive text-xs">{r.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <Button variant="outline" onClick={resetImport}>Import Another File</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bonus Miles Dialog */}
      <Dialog open={!!bonusMember} onOpenChange={(open) => { if (!open) setBonusMember(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> Give Bonus Miles</DialogTitle>
            {bonusMember && <DialogDescription>Adding bonus miles for <span className="font-semibold text-foreground">{bonusMember.displayName}</span></DialogDescription>}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Miles to add</Label>
              <Input type="number" step="0.1" min="0.1" placeholder="e.g. 5.0" value={bonusMiles} onChange={e => setBonusMiles(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={bonusDate} onChange={e => setBonusDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Reason / Note <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea value={bonusNotes} onChange={e => setBonusNotes(e.target.value)} placeholder="e.g. Volunteer discount, race completion..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBonusMember(null)}>Cancel</Button>
            <Button onClick={handleBonus} disabled={bonusSaving}>
              {bonusSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Bonus Miles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Members Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={(open) => { if (!open) { setMergeDialogOpen(false); setMergePrimaryId(""); setMergeSecondaryId(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><GitMerge className="w-4 h-4" /> Merge Members</DialogTitle>
            <DialogDescription>Combine two accounts into one. All runs from the secondary account are moved to the primary, miles are summed, and the secondary account is deleted.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Keep (primary account)</Label>
              <Select value={mergePrimaryId} onValueChange={setMergePrimaryId}>
                <SelectTrigger><SelectValue placeholder="Select member to keep..." /></SelectTrigger>
                <SelectContent>
                  {(members as MemberRow[] | undefined)?.map(m => (
                    <SelectItem key={m.userId} value={m.userId} disabled={m.userId === mergeSecondaryId}>
                      {m.displayName} — {m.email || "no email"} ({m.totalMiles.toFixed(1)} mi)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Merge from (will be deleted)</Label>
              <Select value={mergeSecondaryId} onValueChange={setMergeSecondaryId}>
                <SelectTrigger><SelectValue placeholder="Select member to remove..." /></SelectTrigger>
                <SelectContent>
                  {(members as MemberRow[] | undefined)?.map(m => (
                    <SelectItem key={m.userId} value={m.userId} disabled={m.userId === mergePrimaryId}>
                      {m.displayName} — {m.email || "no email"} ({m.totalMiles.toFixed(1)} mi)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mergePrimary && mergeSecondary && (
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-3">Preview</p>
                <div className="flex items-center gap-3">
                  <div className="text-center flex-1">
                    <p className="font-semibold text-sm">{mergeSecondary.displayName}</p>
                    <p className="text-xs text-muted-foreground">{mergeSecondary.totalMiles.toFixed(1)} mi</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="text-center flex-1">
                    <p className="font-semibold text-sm">{mergePrimary.displayName}</p>
                    <p className="text-xs text-primary font-bold">{(mergePrimary.totalMiles + mergeSecondary.totalMiles).toFixed(1)} mi total</p>
                  </div>
                </div>
                <p className="text-xs text-destructive mt-3 text-center">"{mergeSecondary.displayName}" will be permanently deleted.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMergeDialogOpen(false); setMergePrimaryId(""); setMergeSecondaryId(""); }}>Cancel</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={!mergePrimaryId || !mergeSecondaryId || mergeSaving}>
                  {mergeSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Merge & Delete Secondary
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <strong>{mergeSecondary?.displayName}</strong> and move all their runs to <strong>{mergePrimary?.displayName}</strong>. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleMerge} className="bg-destructive text-destructive-foreground">Yes, Merge</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) { setDetailUserId(""); setIsEditingMember(false); } }}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="flex items-center gap-2">
                <User className="w-4 h-4" /> Member Profile
              </SheetTitle>
              {memberDetail && !isEditingMember && (
                <Button size="sm" variant="outline" onClick={startEditMember}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
              )}
              {isEditingMember && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={cancelEditMember} disabled={adminUpdateMember.isPending}>
                    <X className="w-3.5 h-3.5 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={saveEditMember} disabled={adminUpdateMember.isPending}>
                    {adminUpdateMember.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                    Save
                  </Button>
                </div>
              )}
            </div>
            <SheetDescription>{isEditingMember ? "Editing member details" : "Full run history and reward progress"}</SheetDescription>
          </SheetHeader>

          {memberDetailLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-8 w-2/3 rounded-lg" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : memberDetail ? (
            <ScrollArea className="flex-1">
              <div className="px-6 py-5 space-y-6">

                {/* Profile header */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={memberDetail.member.profileImageUrl ?? undefined} />
                    <AvatarFallback className="text-lg font-bold">{memberDetail.member.displayName.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    {isEditingMember ? (
                      <Input
                        value={editMemberFields.displayName}
                        onChange={e => setEditMemberFields(f => ({ ...f, displayName: e.target.value }))}
                        className="font-bold font-serif text-lg h-9 mb-1"
                        placeholder="Display name"
                      />
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold font-serif text-xl truncate">{memberDetail.member.displayName}</h2>
                        {memberDetail.member.isAdmin && <Badge variant="outline" className="text-[10px] py-0"><ShieldAlert className="w-3 h-3 mr-1"/>Admin</Badge>}
                      </div>
                    )}
                    {!isEditingMember && memberDetail.member.email && <p className="text-sm text-muted-foreground truncate">{memberDetail.member.email}</p>}
                    <p className="text-xs text-muted-foreground">Joined {format(new Date(memberDetail.member.joinedAt), "MMMM yyyy")}</p>
                  </div>
                </div>

                {/* Contact info — read-only or edit form */}
                {isEditingMember ? (
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact Details</p>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
                      <Input value={editMemberFields.email} onChange={e => setEditMemberFields(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" type="email" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</Label>
                      <Input value={editMemberFields.phone} onChange={e => setEditMemberFields(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" type="tel" />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Emergency Contact</p>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><PhoneCall className="w-3 h-3" /> Contact Name</Label>
                      <Input value={editMemberFields.emergencyContact} onChange={e => setEditMemberFields(f => ({ ...f, emergencyContact: e.target.value }))} placeholder="Full name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><PhoneCall className="w-3 h-3" /> Contact Phone</Label>
                      <Input value={editMemberFields.emergencyPhone} onChange={e => setEditMemberFields(f => ({ ...f, emergencyPhone: e.target.value }))} placeholder="(555) 000-0000" type="tel" />
                    </div>
                  </div>
                ) : (
                  (memberDetail.member.phone || memberDetail.member.emergencyContact || (memberDetail.member as any).emergencyPhone) ? (
                    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                      {memberDetail.member.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span>{memberDetail.member.email}</span>
                        </div>
                      )}
                      {memberDetail.member.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span>{memberDetail.member.phone}</span>
                        </div>
                      )}
                      {memberDetail.member.emergencyContact && (
                        <div className="flex items-center gap-2 text-sm">
                          <PhoneCall className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-muted-foreground text-xs mr-1">Emergency:</span>
                          <span>{memberDetail.member.emergencyContact}</span>
                          {(memberDetail.member as any).emergencyPhone && <span className="text-muted-foreground">· {(memberDetail.member as any).emergencyPhone}</span>}
                        </div>
                      )}
                    </div>
                  ) : null
                )}

                {/* Miles summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <p className="text-3xl font-bold font-serif text-primary">{memberDetail.member.totalMiles.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Total Miles</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <p className="text-3xl font-bold font-serif">{memberDetail.runs.length}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Runs Logged</p>
                  </div>
                </div>

                {/* Next reward progress */}
                {memberDetail.nextTier && memberDetail.milesUntilNext != null && (
                  <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Next: {memberDetail.nextTier.name}</span>
                      <span className="text-muted-foreground text-xs">{memberDetail.milesUntilNext.toFixed(1)} mi to go</span>
                    </div>
                    <Progress
                      value={Math.min(100, (memberDetail.member.totalMiles / memberDetail.nextTier.milesRequired) * 100)}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">{memberDetail.member.totalMiles.toFixed(1)} / {memberDetail.nextTier.milesRequired} miles</p>
                  </div>
                )}

                {/* Earned tiers */}
                {memberDetail.earnedTiers.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-500" /> Earned Rewards</h3>
                    <div className="flex flex-wrap gap-2">
                      {memberDetail.earnedTiers.map(tier => (
                        <Badge key={tier.id} variant="secondary" className="text-xs gap-1">
                          ✓ {tier.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Run history */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5"><Footprints className="w-4 h-4" /> Run History</h3>
                    <Select value={memberDetailSourceFilter} onValueChange={(v) => setMemberDetailSourceFilter(v as typeof memberDetailSourceFilter)}>
                      <SelectTrigger className="h-7 text-xs w-32">
                        <SelectValue placeholder="All sources" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All sources</SelectItem>
                        <SelectItem value="manual">Manual only</SelectItem>
                        <SelectItem value="strava">Strava only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {memberDetail.runs.filter(r => memberDetailSourceFilter === "all" || r.source === memberDetailSourceFilter).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {memberDetail.runs.length === 0 ? "No runs logged yet." : "No runs match this filter."}
                    </p>
                  ) : (
                    <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                      {memberDetail.runs
                        .filter(r => memberDetailSourceFilter === "all" || r.source === memberDetailSourceFilter)
                        .map(run => (
                        <div key={run.id} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="text-center w-10">
                              <p className="text-[10px] text-muted-foreground uppercase leading-none">{format(new Date(run.date), "MMM")}</p>
                              <p className="text-lg font-bold font-serif leading-tight">{format(new Date(run.date), "d")}</p>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-semibold text-sm text-primary">{run.distanceMiles} mi</p>
                                {run.source === "strava" ? (
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-[#FC4C02]/10 text-[#FC4C02] border-[#FC4C02]/30 rounded-full font-medium">
                                    <Activity className="w-2.5 h-2.5" /> Strava
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 rounded-full text-muted-foreground">
                                    Manual
                                  </Badge>
                                )}
                              </div>
                              {run.notes && <p className="text-xs text-muted-foreground italic">"{run.notes}"</p>}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">{format(new Date(run.date), "yyyy")}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </ScrollArea>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Edit Club Event Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => { if (!open) setEditingEvent(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Club Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Event Name</Label>
              <Input
                value={editingEvent?.name ?? ""}
                onChange={e => setEditingEvent(ev => ev ? { ...ev, name: e.target.value } : ev)}
                placeholder="e.g. Friday Morning Run"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={editingEvent?.date ?? ""}
                onChange={e => setEditingEvent(ev => ev ? { ...ev, date: e.target.value } : ev)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                value={editingEvent?.description ?? ""}
                onChange={e => setEditingEvent(ev => ev ? { ...ev, description: e.target.value } : ev)}
                placeholder="e.g. Meet at the café at 9am"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEvent(null)}>Cancel</Button>
            <Button
              disabled={editEventSaving || !editingEvent?.name.trim() || !editingEvent?.date}
              onClick={async () => {
                if (!editingEvent) return;
                setEditEventSaving(true);
                try {
                  await updateEventMutation.mutateAsync({
                    eventId: editingEvent.id,
                    data: { name: editingEvent.name, date: editingEvent.date, description: editingEvent.description || undefined }
                  });
                  queryClient.invalidateQueries({ queryKey: getListClubEventsQueryKey() });
                  toast.success("Event updated!");
                  setEditingEvent(null);
                } catch {
                  toast.error("Failed to update event");
                } finally {
                  setEditEventSaving(false);
                }
              }}
            >
              {editEventSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Run Dialog (admin) */}
      <Dialog open={!!editRun} onOpenChange={(open) => { if (!open) setEditRun(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Run</DialogTitle>
            {editRun && <DialogDescription>{editRun.memberDisplayName} — {format(new Date(editRun.date), "PPP")}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Distance (miles)</Label>
              <Input type="number" step="0.1" min="0.1" value={editDistance} onChange={(e) => setEditDistance(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="How did it go?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRun(null)}>Cancel</Button>
            <Button onClick={handleEditRunSave} disabled={editSaving}>
              {editSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
