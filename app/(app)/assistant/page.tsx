"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Handshake, Sparkles, Send, Ticket, Wrench, ShieldCheck } from "lucide-react";import { useStore } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/constants";
import { localId, relativeTime } from "@/lib/utils";
import type { AiMessage } from "@/lib/types";
import { PageHeader, Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const RULES: { test: RegExp; answer: string; suggestions?: string[] }[] = [
  {
    test: /warranty|replacement|repair approv/i,
    answer:
      "Warranty, repair-authorisation and replacement decisions stay with the OEM in RAYVIQ — the platform only tracks evidence and approvals. Engineers submit findings; the OEM approves or rejects. Ask me about the report review workflow if you'd like the details.",
    suggestions: ["How does report review work?", "Show escalation rules"],
  },
  {
    test: /report|review|clarification/i,
    answer:
      "Service reports move through: Draft → Submitted (by engineer) → OEM review → Approved (ticket Completed) or Clarification requested (ticket returns to the engineer). Rejected reports also return as clarification_required. Evidence: photos, error codes, parts used and customer acknowledgement are captured in the report.",
    suggestions: ["What happens after rejection?", "How do escalations work?"],
  },
  {
    test: /escalat|sla|overdue|breach/i,
    answer:
      "SLA targets per priority (response, assignment, visit, resolution) live in Platform Settings. When a target is at risk or breached, an escalation can be raised to OEM, OEM senior management, or RAYVIQ ops. Escalation levels 1–3 notify configured roles and show on the ticket timeline.",
    suggestions: ["Who can raise an escalation?", "Show the ticket lifecycle"],
  },
  {
    test: /lifecycle|status|workflow|ticket flow/i,
    answer:
      "The ticket lifecycle has 15 states: New → Under review → Awaiting assignment → Offered → Accepted → Contact pending → Visit scheduled → In progress → Report submitted → Awaiting OEM review → (Clarification required) → Completed → Closed. Rejections fall back to Awaiting assignment; escalation can happen from several states. Not every role can perform every transition — the UI gates buttons, the backend must enforce the same matrix.",
    suggestions: ["Which roles can close a ticket?", "How does assignment matching work?"],
  },
  {
    test: /assign|match|engineer.*find|fallback|reject/i,
    answer:
      "Assignment matching scores engineers on: same city/state, product expertise match, skill-group match, availability, current load vs max capacity, rating and service radius — with reasons shown per engineer. Offers have a response timeout (default from Assignment settings); on rejection or no-response the ticket returns to the queue and fallback assignment kicks in.",
    suggestions: ["What is the offer timeout?", "How do I create a ticket?"],
  },
  {
    test: /amc|maintenance|preventive|renewal/i,
    answer:
      "AMC contracts define coverage (preventive visits, breakdown visits, labour, travel, spare parts policy) and a response SLA in hours. Maintenance visits run statuses from maintenance_due → … → review_completed with per-visit checklists. Renewals surface as expiring/renewal_due contracts in the AMC module.",
    suggestions: ["Show the escalation rules", "Tell me about SLAs"],
  },
  {
    test: /create.*ticket|new ticket|raise.*ticket/i,
    answer:
      "OEM roles can raise tickets from New ticket (or Engineers/Customers can log one): pick customer → site → equipment, describe the issue with category and priority, add contact availability and location. SLA clocks start immediately based on priority, and notifications fan out to OEM + platform roles.",
    suggestions: ["How does assignment matching work?", "Show the ticket lifecycle"],
  },
  {
    test: /sms|email|whatsapp|notif|otp/i,
    answer:
      "Notification channels (in-app, email, SMS, WhatsApp) are modelled with templates and delivery states, but nothing is actually sent in this demo — there is no provider connected. Configure providers via Integrations once the backend exists.",
    suggestions: ["Which integrations exist?"],
  },
  {
    test: /integrat|crm|erp|payment/i,
    answer:
      "The Integrations catalogue covers CRM, ERP, warranty systems, email, SMS, WhatsApp, maps, AI, storage and payments. Each shows state (not connected / demo / configured / error / disabled) with setup steps. Toggling here simulates connection state only.",
    suggestions: ["Who can manage integrations?"],
  },
  {
    test: /roles?|permission|access|rbac/i,
    answer:
      "Eight demo roles: OEM Admin, OEM Service Manager, OEM Service Executive, Engineer, Partner Manager, RAYVIQ Super Admin, Operations Manager and Support Executive. Use the role switcher in the top bar to explore each. Note: client-side permissions are for demonstration — real enforcement belongs on the server.",
    suggestions: ["Show the ticket lifecycle", "How does report review work?"],
  },
  {
    test: /hello|hi\b|hey|namaste/i,
    answer:
      "Hello! I'm the RAYVIQ service assistant demo. I can explain ticket lifecycle, assignment matching, SLAs and escalations, report review, AMC, notifications and roles. What would you like to know?",
    suggestions: ["Show the ticket lifecycle", "How does assignment matching work?"],
  },
  {
    test: /^[\s\S]*$/,
    answer:
      "I'm a rules-based demo assistant without a live LLM connection, so I may not have an exact answer. Try asking about: the ticket lifecycle, assignment matching, report review, SLAs and escalations, AMC, notifications, integrations or roles.",
    suggestions: ["Show the ticket lifecycle", "How does report review work?"],
  },
];

export default function AssistantPage() {
  const { state, effectiveRole, toast } = useStore();
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: localId("MSG"),
      role: "assistant",
      text: "Hi! I'm the RAYVIQ service assistant. Ask me how tickets, assignments, reports, SLAs or AMC work in this platform. I run on scripted demo logic — no external AI service is connected.",
      at: new Date().toISOString(),
      suggestions: ["Show the ticket lifecycle", "How does assignment matching work?", "Tell me about AMC"],
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  const answerFor = (text: string): { text: string; suggestions?: string[] } => {
    const rule = RULES.find((r) => r.test.test(text));
    if (!rule) return { text: RULES[RULES.length - 1].answer, suggestions: RULES[RULES.length - 1].suggestions };
    return {
      text: rule.answer,
      suggestions: rule.suggestions,
    };
  };

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    const userMsg: AiMessage = {
      id: localId("MSG"),
      role: "user",
      text: trimmed,
      at: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    window.setTimeout(() => {
      const { text: reply, suggestions } = answerFor(trimmed);
      setMessages((m) => [
        ...m,
        {
          id: localId("MSG"),
          role: "assistant",
          text: reply,
          at: new Date().toISOString(),
          suggestions,
          handoffOffered: /human|person|agent|support|talk/i.test(trimmed),
        },
      ]);
      setTyping(false);
    }, 550);
  };

  const openTicketCount = state.tickets.filter((t) => t.status !== "closed" && t.status !== "completed").length;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="AI Service Assistant"
        description="A demonstration assistant grounded in RAYVIQ's workflows. Rules-based (no live LLM) — it explains how the platform works and never makes warranty or replacement decisions."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              setMessages(messages.slice(0, 1));
              toast("Conversation reset", { tone: "info" });
            }}
          >
            Reset chat
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Open tickets", value: openTicketCount, icon: Ticket },
          { label: "My role", value: ROLE_LABELS[effectiveRole].split(" ")[0], icon: ShieldCheck },
          { label: "Engineers", value: state.engineers.length, icon: Wrench },
          { label: "Mode", value: "Demo rules", icon: Sparkles },
        ].map((s) => (
          <Card key={s.label} className="p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
              <s.icon className="h-3 w-3" /> {s.label}
            </p>
            <p className="mt-1 text-lg font-semibold text-ink">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card padded={false} className="flex h-[min(70vh,640px)] flex-col overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100 text-accent-600">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">RAYVIQ Assistant</p>
            <p className="text-[11px] text-ink-muted">
              Rules-based demo · knows {RULES.length} topics · no data leaves this browser
            </p>
          </div>
          <Badge tone="cyan" className="ml-auto">
            Offline AI
          </Badge>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-6 sm:max-w-[75%] ${
                  m.role === "user"
                    ? "rounded-br-md bg-brand-600 text-white"
                    : "rounded-bl-md bg-surface-alt text-ink-soft"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {m.suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="rounded-full border border-brand-200 bg-surface px-2.5 py-1 text-[11px] font-medium text-brand-700 transition-colors hover:bg-brand-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {m.handoffOffered && (
                  <div className="mt-2.5 rounded-lg border border-warning-100 bg-warning-50 p-2.5 text-[12px] leading-5 text-warning-700">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Handshake className="h-3.5 w-3.5" /> Human handoff offered
                    </span>
                    <p className="mt-1">
                      With SMS/WhatsApp enabled, the customer would receive a &quot;Talk to a
                      person&quot; option that routes to your support team. Messaging is simulated
                      in this demo.
                    </p>
                  </div>
                )}
                <p className={`mt-1.5 text-[10px] ${m.role === "user" ? "text-white/60" : "text-ink-faint"}`}>
                  {relativeTime(m.at)}
                </p>
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-surface-alt px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="flex items-center gap-2 border-t border-line px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about ticket lifecycle, SLAs, assignments…"
            aria-label="Message the assistant"
            className="h-10 flex-1 rounded-lg border border-line-strong bg-surface px-3.5 text-sm placeholder:text-ink-faint focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || typing} aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>

      <p className="mt-3 text-center text-xs text-ink-faint">
        Disclaimer: the assistant explains platform workflows only. It never approves warranty,
        repair or replacement outcomes — those stay with the OEM.
      </p>
    </div>
  );
}
