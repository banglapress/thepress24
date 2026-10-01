import type { RoleId, StageId } from "./types";

export const APP_NAME = "The Press24";
export const APP_NAME_BN = "দ্য প্রেস রানডাউন";
export const APP_TAGLINE = "স্মার্ট রানডাউন";

export const ROLES: Record<
  RoleId,
  { label: string; desk: string; youDo: string }
> = {
  writer: {
    label: "স্ক্রিপ্ট রাইটার",
    desk: "রাইটিং",
    youDo: "শুধু আপনাকে অ্যাসাইন করা বিষয় লিখুন, তারপর রিভিউতে জমা দিন।",
  },
  script_editor: {
    label: "স্ক্রিপ্ট এডিটর",
    desk: "স্ক্রিপ্ট ডেস্ক",
    youDo: "স্ক্রিপ্ট পাস বা ফেরত দিন। পাসের সময় প্রোডিউসার ও প্রেজেন্টার অ্যাসাইন করুন।",
  },
  producer: {
    label: "প্রোডিউসার",
    desk: "প্রোডাকশন",
    youDo: "অ্যাসাইন করা শুট ডান করুন। প্রেজেন্টারও ডান করলেই এডিটিং কিউ খুলবে।",
  },
  presenter: {
    label: "প্রেজেন্টার",
    desk: "প্রেজেন্টেশন",
    youDo: "অ্যাসাইন করা আইটেম প্রেজেন্ট করুন। প্রোডিউসারও ডান করলেই এডিটিং কিউ খুলবে।",
  },
  video_editor: {
    label: "ভিডিও এডিটর",
    desk: "এডিটিং",
    youDo: "শুট ও প্রেজেন্টেশন দুটোই ডান হলে কাট করুন, তারপর ভিডিও রিভিউতে পাঠান।",
  },
  planning_editor: {
    label: "ভিডিও রিভিউ",
    desk: "ভিডিও রিভিউ",
    youDo: "বিষয় পাস করে রাইটার অ্যাসাইন করুন। কাটে শিরোনাম ও থাম্বনেইল দিন।",
  },
  social: {
    label: "সোশ্যাল ম্যানেজার",
    desk: "ডিস্ট্রিবিউশন",
    youDo: "ফেসবুক ও ইউটিউব — দুটোতেই আপলোড মার্ক করলেই প্রকাশিত।",
  },
};

export const STAGES: Record<StageId, { label: string; hint: string }> = {
  scripting: { label: "স্ক্রিপ্ট", hint: "লেখা চলছে" },
  script_review: { label: "স্ক্রিপ্ট রিভিউ", hint: "এডিটরের গেট" },
  shooting: { label: "শুট ও প্রেজেন্ট", hint: "প্রোডিউসার ও প্রেজেন্টার দুজনেই ডান" },
  editing: { label: "এডিটিং", hint: "কাট চলছে" },
  cut_review: { label: "ভিডিও রিভিউ", hint: "ভিডিও রিভিউ গেট" },
  upload: { label: "আপলোড", hint: "ফেসবুক + ইউটিউব" },
  published: { label: "প্রকাশিত", hint: "দুই চ্যানেলেই" },
};

export const PIPELINE_STAGES: StageId[] = [
  "scripting",
  "script_review",
  "shooting",
  "editing",
  "cut_review",
  "upload",
  "published",
];

export const ROLE_GATE_STAGE: Record<RoleId, StageId | null> = {
  writer: "scripting",
  script_editor: "script_review",
  producer: "shooting",
  presenter: "shooting",
  video_editor: "editing",
  planning_editor: "cut_review",
  social: "upload",
};
