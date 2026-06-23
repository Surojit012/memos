# memos Skills

Skills allow agents to grow.

Skills are lightweight capabilities.

Skills are not mini-agents.

---

# Skill Structure

Each skill contains:

name

description

input_schema

output_schema

prompt_template

tags

version

author

---

# Rules

Skills must be atomic.

Skills must do one thing only.

Skills must be deterministic when possible.

Skills must produce structured output.

Skills cannot directly mutate memory.

Memory updates must happen through Memory Manager.

---

# Example Skills

Web Researcher

Input:

topic

Output:

summary

---

Technical Summarizer

Input:

article

Output:

bullet_points

---

Trend Analyzer

Input:

dataset

Output:

insights

---

Question Generator

Input:

document

Output:

questions

---

# Skill Lifecycle

Publish

↓

Validate

↓

Execute

↓

Observe

↓

Learn

---

# Success Metrics

Execution Count

Average Latency

Quality Score

Reuse Rate

Agent Improvement Score

---

# V1 Scope

Maximum skills:

10

Focus areas:

Research

Summarization

Analysis

Knowledge Extraction

Do not build:

Payments

Economics

Escrow

Blockchain settlements

Marketplace gamification
