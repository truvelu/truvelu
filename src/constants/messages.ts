export const MESSAGES: {
  id: string;
  role: "user" | "assistant" | "system";
  parts: {
    type: string;
    text: string;
    canvas?: { title: string; value: string };
  }[];
}[] = [
  {
    id: "1",
    role: "user",
    parts: [{ type: "text", text: "Hello, how are you?" }],
  },
  {
    id: "2",
    role: "assistant",
    parts: [{ type: "text", text: "I am good, thank you!" }],
  },
  {
    id: "3",
    role: "user",
    parts: [{ type: "text", text: "What is the capital of France?" }],
  },
  {
    id: "4",
    role: "assistant",
    parts: [{ type: "text", text: "The capital of France is Paris." }],
  },
  {
    id: "5",
    role: "user",
    parts: [{ type: "text", text: "What is the capital of Germany?" }],
  },
  {
    id: "6",
    role: "assistant",
    parts: [{ type: "text", text: "The capital of Germany is Berlin." }],
  },
  {
    id: "7",
    role: "user",
    parts: [{ type: "text", text: "What is the capital of Italy?" }],
  },
  {
    id: "8",
    role: "assistant",
    parts: [{ type: "text", text: "The capital of Italy is Rome." }],
  },
  {
    id: "9",
    role: "user",
    parts: [{ type: "text", text: "What is the capital of Spain?" }],
  },
  {
    id: "10",
    role: "assistant",
    parts: [{ type: "text", text: "The capital of Spain is Madrid." }],
  },
  {
    id: "11",
    role: "user",
    parts: [{ type: "text", text: "What is the capital of Portugal?" }],
  },
  {
    id: "12",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "The capital of Portugal is Lisbon. I'm a chatbot. I'm here to help you with your questions.",
      },
    ],
  },
  {
    id: "13",
    role: "user",
    parts: [
      {
        type: "text",
        text: "if i want to build saas with e2b please calculate thhe cogs and give calculation of the user scale site: https://e2b.dev/pricing",
      },
    ],
  },
  {
    id: "14",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "I will explain how to calculate the cogs for a saas in canvas",
        canvas: {
          title: "COGS Calculation",
          value: `## Summary

Based on E2B’s official pricing, there are two primary tiers: Hobby, which is free per month with usage costs, and Pro, which is $150 per month plus usage costs ([E2B][1]). The Hobby tier includes a one-time $100 usage credit, community support, up to 1-hour sandbox sessions, and supports up to 20 concurrent sandboxes ([E2B][1]). The Pro tier adds another $100 credit, a dedicated Slack channel, prioritized features, customizable CPU & RAM, up to 24-hour sessions, and up to 100 concurrent sandboxes ([E2B][1]). Compute usage is billed per second: $0.000014 per vCPU and $0.0000045 per GiB of RAM ([E2B][1]), while storage is free up to the plan’s included allowance ([E2B][1]). By default, each sandbox comes with 2 vCPU and 512 MiB of RAM, yielding a base compute rate of $0.000028 per second ([E2B][1]). Using these parameters, we can calculate your COGS per user by modeling their average sandbox usage and then scale to different user counts.

## COGS Components

### Subscription Cost

* **Hobby tier subscription:** $0 per month ([E2B][1])
* **Pro tier subscription:** $150 per month ([E2B][1])

You’ll amortize the subscription cost across your total user base:
[
\text{Subscription COGS per user} = \frac{\text{Monthly plan fee}}{N_{\text{users}}}
]

### Usage Cost

E2B charges compute costs by second of sandbox uptime. For the default configuration:

* **vCPU:** 2 vCPU × $0.000014 /vCPU/s = $0.000028 per second ([E2B][1])
* **RAM:** 512 MiB (= 0.5 GiB) × $0.0000045 /GiB/s = $0.00000225 per second ([E2B][1])
* **Storage:** Free up to 1 GiB (Hobby) or 5 GiB (Pro) ([E2B][1])

Thus, **Total default compute cost** = $0.000028 (s) + $0.00000225 (s) = **$0.00003025 per second**.

### Other Considerations

* **One-time credits:** Each new account receives $100 free usage credit, which can offset early COGS ([E2B][1]).
* **Concurrency limits:** Hobby supports 20 concurrent sandboxes; Pro up to 100 ([E2B][1]). Plan accordingly if you run parallel sessions.

## Per-User COGS Example

Assume each user runs their sandbox for **1 hour** (3,600 s) per month on the default configuration:

1. **Compute cost per user per month**
   [
   3{,}600\ \text{s} \times $0.00003025/\text{s}
   = $0.1089
   ]

2. **Subscription cost per user**

   * Hobby: $0 (Hobby tier)
   * Pro: $150 / (N) users

3. **Total COGS per user**
   [
   \text{COGS} = $0.1089 + \frac{$150}{N}
   ]

## COGS at Different Scales

| Number of Users (N) | Subscription per User | Compute per User (1 h) | Total COGS per User |
| ------------------- | --------------------- | ---------------------- | ------------------- |
| 100                 | $1.50                 | $0.1089                | $1.6089             |
| 500                 | $0.30                 | $0.1089                | $0.4089             |
| 1,000               | $0.15                 | $0.1089                | $0.2589             |
| 5,000               | $0.03                 | $0.1089                | $0.1389             |

This illustrates how, as you scale, the fixed subscription cost per user diminishes, leaving compute consumption as the primary driver of COGS.

---

Feel free to adjust the assumed usage hours or sandbox configuration to match your specific SaaS workloads.

[1]: https://e2b.dev/docs/legacy/pricing "E2B - Code Interpreting for AI apps"
`,
        },
      },
    ],
  },
  {
    id: "15",
    role: "user",
    parts: [
      {
        type: "text",
        text: "if i want to build saas with e2b please calculate thhe cogs and give calculation of the user scale site: https://e2b.dev/pricing",
      },
    ],
  },

  {
    id: "16",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "The capital of Portugal is Lisbon. I'm a chatbot. I'm here to help you with your questions.",
      },
    ],
  },
];