# OrgGraph – Product Requirements Document (PRD)

## 1. Overview

OrgGraph is a personal knowledge graph designed to help a tech lead map relationships between people, teams, and systems in a large organisation.

The goal is to make it easy to answer:

* Who can help with X?
* What team owns Y?
* How are these people connected?

---

## 2. Goals

### Primary Goal

Reduce time to identify the right people or teams for a given problem.

### Success Criteria

* Answer “who can help with X?” in < 10 seconds
* Used daily for:

  * meeting prep
  * incident response
  * planning

---

## 3. Core Concepts

### Nodes

Represents entities in the organisation.

Types:

* Person

Fields:

* id
* name
* type
* team
* notes
* tags (future)

---

### Edges

Represents relationships between nodes.

Fields:

* id
* from_id
* to_id
* type (optional)

---

## 4. MVP Features

### Backend

* Create node
* Get nodes
* Create edge
* Get edges

### Data Storage

* Initially in-memory
* Move to PostgreSQL

---

### Frontend (Initial)

* List nodes
* Add node
* Create relationship

---

## 5. Future Features

### Graph Visualisation

* Interactive graph view
* Explore connections

### AI Querying

* Natural language queries:

  * “Who can help with payments latency?”

### Smart Features

* Auto-tagging
* Relationship suggestions

---

## 6. Privacy Principles

* All core data stored locally
* AI receives only minimal context
* No full dataset sent externally
* AI provider abstraction layer

---

## 7. Technical Stack

### Backend

* Go (REST API)

### Frontend

* React (Vite)

### Database

* PostgreSQL

### AI

* OpenAI (initial)
* Local models (future)

---

## 8. Development Phases

### Phase 1

* Nodes API
* Edges API
* In-memory storage

### Phase 2

* PostgreSQL integration

### Phase 3

* Frontend UI

### Phase 4

* Graph visualisation

### Phase 5

* AI integration

---

## 9. Non-Goals

* Not a full org chart system
* Not multi-user
* Not production SaaS (yet)

---
