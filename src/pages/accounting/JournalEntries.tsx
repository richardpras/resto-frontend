import { useMemo, useState } from "react";
import { useAccountingStore, JournalEntry, JournalLine, formatIDR } from "@/stores/accountingStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Send, Eye } from "lucide-react";
import { toast } from "sonner";

const uid = () => Math.random().toString(36).slice(2, 10);

export default function JournalEntries() {
  const journals = useAccountingStore((s) => s.journals);
  const accounts = useAccountingStore((s) => s.accounts);
  const outlets = useAccountingStore((s) => s.outlets);
  const createJournalRemote = useAccountingStore((s) => s.createJournalRemote);
  const updateJournalRemote = useAccountingStore((s) => s.updateJournalRemote);
  const deleteJournalRemote = useAccountingStore((s) => s.deleteJournalRemote);
  const postJournalRemote = useAccountingStore((s) => s.postJournalRemote);
  const revalidateBaseData = useAccountingStore((s) => s.revalidateBaseData);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<JournalEntry | null>(null);

  const blankLine = (): JournalLine => ({
    id: uid(),
    accountId: accounts[0]?.id ?? "",
    debit: 0,
    credit: 0,
  });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [outlet, setOutlet] = useState(outlets[0]);
  const [lines, setLines] = useState<JournalLine[]>([blankLine(), blankLine()]);

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const balanced = totalDebit === totalCredit && totalDebit > 0;

  const reset = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setReference(""); setDescription(""); setOutlet(outlets[0]);
    setLines([blankLine(), blankLine()]);
    setEditingId(null);
  };

  const openNew = () => { reset(); setOpen(true); };
  const openEdit = (j: JournalEntry) => {
    setEditingId(j.id); setDate(j.date); setReference(j.reference || "");
    setDescription(j.description); setOutlet(j.outlet); setLines(j.lines);
    setOpen(true);
  };

  const save = async (post: boolean) => {
    if (!description) {
      toast.error("Description required");
      return;
    }
    if (!balanced) {
      toast.error("Debit must equal credit");
      return;
    }
    if (accounts.length < 2) {
      toast.error("Create at least two accounts in Chart of Accounts first");
      return;
    }
    const linePayload = lines.map((l) => ({
      accountId: l.accountId,
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
    }));
    try {
      if (editingId) {
        await updateJournalRemote(editingId, {
          journalDate: date,
          description,
          outlet,
          lines: linePayload,
        });
        if (post) {
          await postJournalRemote(editingId);
        }
      } else {
        await createJournalRemote({
          journalDate: date,
          description,
          outlet,
          journalNo: reference || undefined,
          status: post ? "posted" : "draft",
          lines: linePayload,
        });
      }
      await revalidateBaseData();
      toast.success(post ? "Journal posted" : "Draft saved");
      setOpen(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    }
  };

  const updLine = (id: string, patch: Partial<JournalLine>) =>
    setLines(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const sorted = useMemo(() => [...journals].sort((a, b) => b.date.localeCompare(a.date)), [journals]);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Journal Entries</h2>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Journal</Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Outlet</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((j) => {
              const td = j.lines.reduce((s, l) => s + l.debit, 0);
              const tc = j.lines.reduce((s, l) => s + l.credit, 0);
              return (
                <TableRow key={j.id}>
                  <TableCell>{j.date}</TableCell>
                  <TableCell className="font-mono text-sm">{j.reference || "—"}</TableCell>
                  <TableCell>{j.description}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{j.outlet}</TableCell>
                  <TableCell className="text-right font-mono">{formatIDR(td)}</TableCell>
                  <TableCell className="text-right font-mono">{formatIDR(tc)}</TableCell>
                  <TableCell>
                    <Badge variant={j.status === "posted" ? "default" : "secondary"}>{j.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setViewing(j)}><Eye className="h-4 w-4" /></Button>
                    {j.status === "draft" && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(j)}>✏️</Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            void (async () => {
                              try {
                                await postJournalRemote(j.id);
                                await revalidateBaseData();
                                toast.success("Posted");
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : "Post failed");
                              }
                            })();
                          }}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            void (async () => {
                              try {
                                await deleteJournalRemote(j.id);
                                await revalidateBaseData();
                                toast.success("Deleted");
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : "Delete failed");
                              }
                            })();
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Editor Dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{editingId ? "Edit Journal" : "New Journal Entry"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="INV-001" /></div>
              <div>
                <Label>Outlet</Label>
                <Select value={outlet} onValueChange={setOutlet}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{outlets.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Select value={l.accountId} onValueChange={(v) => updLine(l.id, { accountId: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={l.debit} className="text-right"
                          onChange={(e) => updLine(l.id, { debit: Number(e.target.value), credit: 0 })} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={l.credit} className="text-right"
                          onChange={(e) => updLine(l.id, { credit: Number(e.target.value), debit: 0 })} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setLines(lines.filter((x) => x.id !== l.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setLines([...lines, blankLine()])}>
                <Plus className="h-3 w-3 mr-1" /> Add line
              </Button>
              <div className="text-sm flex gap-4">
                <span>Debit: <span className="font-mono font-semibold">{formatIDR(totalDebit)}</span></span>
                <span>Credit: <span className="font-mono font-semibold">{formatIDR(totalCredit)}</span></span>
                <Badge variant={balanced ? "default" : "destructive"}>{balanced ? "Balanced" : "Unbalanced"}</Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="secondary" onClick={() => void save(false)}>Save Draft</Button>
            <Button onClick={() => void save(true)} disabled={!balanced}>Post Journal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Journal Detail</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Date: </span>{viewing.date}</div>
                <div><span className="text-muted-foreground">Ref: </span>{viewing.reference || "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Description: </span>{viewing.description}</div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow></TableHeader>
                <TableBody>
                  {viewing.lines.map((l) => {
                    const a = accounts.find((x) => x.id === l.accountId);
                    return (
                      <TableRow key={l.id}>
                        <TableCell>{a?.code} — {a?.name}</TableCell>
                        <TableCell className="text-right font-mono">{l.debit ? formatIDR(l.debit) : "—"}</TableCell>
                        <TableCell className="text-right font-mono">{l.credit ? formatIDR(l.credit) : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
