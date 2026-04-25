## DailyAI — Application d'adoption de l'IA en entreprise

Une app multi-tenant qui motive les employés à utiliser l'IA via une bibliothèque de tâches, un système de coins, un leaderboard et des récompenses.

---

### 🔐 Authentification & multi-tenant

- **Inscription** (email + mot de passe) → création automatique d'un nouveau workspace dont le nouvel utilisateur devient **manager**.
- **Login** classique avec session persistante.
- **Invitation par email** : un manager invite un employé via son email depuis l'app. L'invité reçoit un email avec un lien d'inscription qui le rattache automatiquement au bon workspace avec le rôle **user**.
- Toutes les données (tâches, completions, récompenses, leaderboard) sont **isolées par workspace** via Row-Level Security.

### 👥 Rôles

- **Manager** : gérer les membres (inviter, retirer), créer/modifier/supprimer les tâches de la bibliothèque, créer/gérer le catalogue de récompenses, valider les complétions de tâches, approuver/refuser les demandes de récompenses.
- **User** : voir les tâches disponibles, déclarer une complétion (en attente de validation), voir ses coins, son streak, sa position au leaderboard, demander des récompenses.

### 📚 Bibliothèque de tâches IA

- 100% créée par les managers du workspace (vide au départ).
- Chaque tâche a : titre, description, département (Finance, Sales, Legal, HR, Engineering, ou custom), valeur en coins.
- Filtres par département (onglets All / Finance / Sales / Legal / HR / Engineering).
- Les users cliquent sur une tâche → "Marquer comme effectuée" → ajoute optionnellement une note → soumet pour validation.

### ✅ Validation par le manager

- Les managers voient une **file d'attente** des complétions soumises.
- Pour chaque soumission : nom de l'utilisateur, tâche, date, note → boutons **Approuver** ou **Refuser**.
- À l'approbation, les coins sont crédités et la tâche compte pour le streak.

### 🎯 Page "Today" (dashboard utilisateur)

- Salutation contextuelle (Good morning/evening).
- Compteur **TODAY** : tâches complétées + coins gagnés / objectif quotidien (100 coins).
- Barre de progression journalière.
- Carte **streak** : nombre de jours consécutifs avec au moins 1 tâche validée + visualisation des 14 derniers jours.

### 🏆 Leaderboard

- Classement mensuel des top utilisateurs du workspace : Rank, Nom, Département, Coins, Tâches complétées, Streak.
- Bloc **Top departments this month** : agrégation des coins par département.
- Mise à jour en temps réel (Supabase realtime).

### 🎁 Rewards (récompenses)

- Catalogue 100% défini par les managers du workspace : nom, description, image/emoji, coût en coins.
- Affichage du solde de coins de l'utilisateur en haut.
- Bouton "Échanger" : déduit les coins (en pending) et envoie une demande au manager.
- Le manager voit les demandes et les **approuve** (déduction confirmée) ou **refuse** (coins remboursés).

### ⚙️ Espace manager

Section dédiée (visible uniquement pour les managers) avec :
- **Membres** : liste, invitations, retrait de membres.
- **Tâches** : CRUD de la bibliothèque.
- **Récompenses** : CRUD du catalogue.
- **Validations** : file d'attente des complétions et des demandes de récompenses.

### 🎨 Design

Reprise fidèle des maquettes :
- Sidebar verte douce à gauche avec logo "DailyAI — Build the AI habit".
- Fond crème (#fcfbf8), cards blanches arrondies, accents verts.
- Navigation : Today, Task Library, Leaderboard, Rewards (+ Manager Console pour les managers).
- Bouton "Get extension" en haut à droite (placeholder, non fonctionnel).

### 🛠 Stack technique

- **Lovable Cloud** (Supabase) pour l'auth, la base de données, RLS multi-tenant, et l'envoi d'emails d'invitation.
- Tables : `workspaces`, `profiles`, `user_roles` (table séparée + enum, sécurisé), `invitations`, `tasks`, `task_completions`, `rewards`, `reward_redemptions`.
- Edge function pour envoyer l'email d'invitation et générer un token d'invitation sécurisé.

### 📌 Hors périmètre (pour plus tard)

- L'extension navigateur (le bouton est juste un placeholder visuel).
- Auto-détection de l'usage d'outils IA (tout est auto-déclaratif validé par manager).
- Notifications email pour les complétions/récompenses (uniquement l'email d'invitation pour le MVP).
