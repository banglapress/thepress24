import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createScript } from "@/lib/press/server";

export function NewScriptDialog({ label = "নতুন স্ক্রিপ্ট" }: { label?: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [topicNote, setTopicNote] = useState("");

  const mutation = useMutation({
    mutationFn: () => createScript({ data: { title, topicNote } }),
    onSuccess: (data) => {
      setTitle("");
      setTopicNote("");
      setOpen(false);
      toast.success("স্ক্রিপ্ট লেখা শুরু হয়েছে");
      void queryClient.invalidateQueries({ queryKey: ["pieces"] });
      void queryClient.invalidateQueries({ queryKey: ["my-report"] });
      window.location.assign(`/p/${data.id}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "স্ক্রিপ্ট শুরু করা যায়নি");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{label}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>নতুন স্ক্রিপ্ট</DialogTitle>
          <DialogDescription>
            কোনো আলাদা অনুমোদন ধাপ নেই। বিষয় লিখে সরাসরি স্ক্রিপ্টে চলে যান।
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <div>
            <Label htmlFor="script-title">বিষয়ের শিরোনাম</Label>
            <Input
              id="script-title"
              className="mt-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="যেমন: ঢাকার মেট্রোরেলের নতুন নিয়ম"
              required
            />
          </div>
          <div>
            <Label htmlFor="script-brief">রিসার্চ নোট</Label>
            <Textarea
              id="script-brief"
              className="mt-2"
              value={topicNote}
              onChange={(e) => setTopicNote(e.target.value)}
              placeholder="কী নিয়ে স্ক্রিপ্ট লিখবেন, প্রয়োজনীয় তথ্য বা অ্যাঙ্গেল"
            />
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "খোলা হচ্ছে…" : "স্ক্রিপ্ট শুরু করুন"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
