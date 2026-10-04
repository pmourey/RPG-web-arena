# ⚔️ RPG Combat Simulator & Batch RPG Game (D&D 5e)

> **Simulateur de combat tactique au tour par tour et moteur d'analyse RPG basé sur les règles de Donjons & Dragons 5e.**
> 
> Ce projet combine une **arène interactive riche** (interface graphique Web moderne) et un **moteur de simulation par lots (mode batch)** permettant de simuler des centaines de combats automatisés pour observer l'équilibrage, la progression des personnages et les statistiques de jeu.

---

## 📑 Table des matières

1. [Vue d'ensemble du projet](#-vue-densemble-du-projet)
2. [Architecture Technique](#-architecture-technique)
   - [Technologies & Stack](#technologies--stack)
   - [Arborescence du Code](#arborescence-du-code)
   - [Cycle de vie et Persistance](#cycle-de-vie-et-persistance)
3. [Structure Métier & Moteur de Règles](#-structure-métier--moteur-de-règles)
   - [Système de Combat 5e](#système-de-combat-5e)
   - [Gestion de la Classe d'Armure (CA)](#gestion-de-la-classe-darmure-ca)
   - [Système de Sorts & Effets Actifs](#système-de-sorts--effets-actifs)
   - [Progression, Niveaux et Butin](#progression-niveaux-et-butin)
4. [Manuel du Joueur](#-manuel-du-joueur)
   - [1. Caractéristiques & Modificateurs](#1-caractéristiques--modificateurs)
   - [2. Déroulement d'un Combat](#2-déroulement-dun-combat)
   - [3. Utilisation des Sorts](#3-utilisation-des-sorts)
   - [4. Gestion de l'Inventaire & Équipement](#4-gestion-de-linventaire--équipement)
   - [5. Formation, Repos et Sauvegardes](#5-formation-repos-et-sauvegardes)
   - [6. Mode Simulation Batch](#6-mode-simulation-batch)
5. [Fichiers de Données & Extensibilité](#-fichiers-de-données--extensibilité)

---

## 🎯 Vue d'ensemble du projet

Le projet propose deux manières complémentaires d'expérimenter le jeu :

- **L'Arène Interactive (Mode Joueur)** : Vous commandez une compagnie de 6 aventuriers (guerriers, paladins, prêtres, mages, bardes, roublards...) face à des vagues de monstres. Chaque tour de héros vous permet de choisir manuellement votre cible, de porter une attaque en mêlée avec votre arme équipée (prenant en compte le multi-attaque) ou d'incanter des sorts puissants consommant vos emplacements de sorts.
- **Le Simulateur Batch (Mode Analyse)** : Permet d'exécuter instantanément des dizaines ou centaines de combats successifs avec gestion automatique des repos, montées de niveau et récolte de butin, pour compiler des statistiques exhaustives (taux de victoire, répartition des monstres tués par niveau, sorts les plus incantés). Vous pouvez ensuite importer directement le groupe vétéran résultant dans l'arène interactive !

---

## 🏗️ Architecture Technique

### Technologies & Stack

- **Runtime** : Node.js 22 (LTS)
- **Framework Front-End** : React 19 (Single Page Application réactive)
- **Langage** : TypeScript 5.7+ en typage strict
- **Build Tooling** : Vite 6 (démarrage instantané, bundling optimisé ES2022)
- **Styling** : Tailwind CSS v4 avec design responsive sombre adapté aux jeux de rôle
- **Iconographie** : Lucide React
- **Hébergement & Port** : Serveur de développement configuré sur `0.0.0.0:3000`

### Arborescence du Code

```text
├── data/ & src/data/          # Fichiers de données du jeu (JSON)
│   ├── heroes.json            # Héros initiaux pré-générés (Tolkien & fantasy)
│   ├── monsters.json          # Types de monstres (niveaux 1 à 20)
│   ├── classes.json           # Définitions des classes (Dés de vie, slots, caractéristiques)
│   ├── races.json             # Races jouables et modificateurs
│   ├── weapons.json           # Armes et dés de dégâts
│   ├── armors.json            # Armures et bonus de CA
│   ├── shields.json           # Boucliers
│   ├── spells.json            # Base de sorts (niveaux 1 à 9 par classe)
│   ├── magic_items.json       # Objets magiques, potions et consommables
│   └── magic_config.json      # Probabilités de drop selon la rareté
│
├── src/
│   ├── types/
│   │   └── game.ts            # Interfaces TypeScript (HeroData, MonsterData, SpellData...)
│   │
│   ├── engine/                # Moteur de jeu pur (D&D 5e)
│   │   ├── dice.ts            # Lancer de dés (d20, d4..d12), calcul de modificateurs
│   │   ├── character.ts       # Calcul de CA, bonus d'attaque, effets, sauvegarde, équipement
│   │   ├── effects.ts         # Registre et résolution des effets de sorts (soin, dégâts, contrôle...)
│   │   ├── battle.ts          # Moteur de combat : initiative, jet de toucher, crits, fumbles, loot
│   │   ├── loader.ts          # Génération du groupe, montée de niveau, chargement des données
│   │   └── simulation.ts      # Simulateur batch de combats automatisés
│   │
│   ├── components/            # Composants UI React
│   │   ├── CharacterCard.tsx        # Cartes des héros et monstres (PV, CA, états, tours)
│   │   ├── ActionPanel.tsx          # Barre d'actions (Attaque de mêlée, sorts avec slots)
│   │   ├── CharacterSheetModal.tsx  # Fiche détaillée à onglets (Aperçu, Inventaire, Sorts)
│   │   ├── CombatLog.tsx            # Journal de combat temps réel avec filtres & auto-scroll
│   │   ├── ReorderModal.tsx         # Réordonnancement de formation (Première ligne vs Arrière-garde)
│   │   ├── KilledMonstersModal.tsx  # Bestiaire des monstres abattus cette session
│   │   └── BatchSimulationModal.tsx # Dialogue d'exécution de la simulation batch & graphiques
│   │
│   ├── App.tsx                # Composant racine, orchestration de l'état et boucle de combat
│   ├── main.tsx               # Point d'entrée React DOM
│   └── index.css              # Feuilles de styles Tailwind CSS
│
├── index.html                 # Document HTML principal
├── package.json               # Dépendances et scripts npm
├── tsconfig.json              # Configuration du compilateur TypeScript
└── vite.config.ts             # Configuration du bundler Vite
```

### Cycle de vie et Persistance

- **Gestion d'état locale** : L'état complet du groupe (PV actuels, inventaire, équipement actif, points d'expérience, or, emplacements de sorts restants) et les statistiques de monstres tués sont synchronisés en temps réel.
- **Sauvegarde silencieuse** : Une persistance automatique s'effectue dans le `localStorage` du navigateur à chaque événement clé (fin de combat, modification de fiche, élimination de monstre, repos), sans polluer le journal de combat.
- **Export & Import JSON** : Deux boutons permettent d'exporter la sauvegarde intégrale sous forme de fichier `.json` sur votre ordinateur et de la réimporter ultérieurement sur n'importe quelle session.

---

## 📜 Structure Métier & Moteur de Règles

Le moteur implémente fidèlement les mécaniques fondamentales du SRD 5e de Donjons & Dragons :

### Système de Combat 5e

1. **Initiative** : Au début de chaque round, chaque combattant vivant effectue un test d'initiative :
   $$\text{Initiative} = 1\text{d}20 + \text{Modificateur de Dextérité} - (\text{Malus d'entrave})$$
   L'ordre d'action est déterminé par ordre décroissant d'initiative.
2. **Jet d'attaque** :
   $$\text{Jet d'attaque} = 1\text{d}20 + \text{Bonus d'attaque (Maîtrise + Caractéristique)}$$
   - Si le jet naturel est un **1** : **Échec Critique (Fumble)**. L'attaquant manque sa cible et subit $1\text{d}4$ points de dégâts de maladresse.
   - Si le jet naturel est un **20** : **Coup Critique**. Les dés de dégâts sont doublés.
   - Si la cible est **Inconsciente (Unconscious)** ou **Paralysée (Paralyzed)** : le coup touche **automatiquement** et devient un **coup critique**.
   - Si $\text{Jet d'attaque} \ge \text{Classe d'Armure (CA)}$ : l'attaque réussit.
   - Si $\text{Jet d'attaque} < \text{CA}$ : l'attaque échoue.

### Gestion de la Classe d'Armure (CA)

La formule de CA s'adapte au type d'armure portée par le héros :
- **Armures lourdes** (*Chainmail Armor, Plate Armor*) :
  $$\text{CA} = 10 + \text{Bonus d'armure} + \text{Bonus de bouclier} + \text{Modificateurs d'effets}$$
  *(La Dextérité n'accorde aucun bonus).*
- **Armures intermédiaires** (*Scale Armor, Hide Armor*) :
  $$\text{CA} = 10 + \text{Bonus d'armure} + \min(2, \text{Modificateur Dex}) + \text{Bonus de bouclier} + \text{Effets}$$
- **Armures légères ou tissus** (*Cloth, Leather, Robe*) :
  $$\text{CA} = 10 + \text{Bonus d'armure} + \text{Modificateur Dex complet} + \text{Bonus de bouclier} + \text{Effets}$$
- **Objets magiques portés** (*Anneaux de protection, etc.*) : ajoutent leur bonus directement à la CA.
- **Effets temporaires** :
  - Sort *Shield* : $+5\text{ CA}$ pendant 1 round.
  - Sort *Foresight* : $+2\text{ CA}$ et $+2$ aux jets d'attaque.
  - Conditions *Aveuglé* ou *Entravé* : $-2\text{ CA}$ et $-2$ aux jets d'attaque.

### Système de Sorts & Effets Actifs

Les lanceurs de sorts (Mage, Prêtre, Barde, Druide, Ensorceleur, Paladin, Rôdeur) ont accès à des sorts classés par niveaux (1 à 9) :

| Catégorie d'effet | Mécanique en jeu |
|---|---|
| **Dégâts d'attaque** | Inflige des dégâts via la formule de dés du sort. Si le sort impose un jet de sauvegarde, la cible teste sa caractéristique contre le DD du lanceur ($\text{DD} = 8 + \text{Modificateur de sort} + \text{Maîtrise}$). Si réussite et `dc_success = half`, dégâts réduits de moitié. |
| **Soin (Heal)** | Restaure les PV d'un allié blessé (jusqu'à son maximum de PV). |
| **Bénédiction (Bless)** | Ajoute un dé de $+1\text{d}4$ aux dégâts de toutes les attaques d'arme de la cible pendant la durée du buff. |
| **Bouclier (Shield)** | Augmente temporairement la CA pour parer les attaques ennemies. |
| **Châtiment (Smite)** | Imprègne l'arme du lanceur : bonus de dégâts majeurs libéré automatiquement au prochain coup d'arme réussi (avec possibilité d'aveugler la cible). |
| **Protection Mortelle (Death Ward)** | Protège le personnage contre le prochain coup fatal : s'il devait tomber à 0 PV, il est instantanément maintenu à 1 PV ! |
| **Résurrection (Revivify / Resurrection)** | Ranime un compagnon tombé au combat avec 1 PV et dissipe ses altérations négatives. |
| **Salvation Absolue (Wish)** | Restaure intégralement les PV de la cible et purge toutes les altérations d'état. |
| **Contrôle Mental / Physique** | Applique des altérations : *Sommeil* (Inconscient), *Paralysie*, *Cécité*, *Effroi*, *Entrave*, *Désavantage*. Les créatures protégées par *Mind Blank* sont immunisées aux effets mentaux et psychiques. |

### Progression, Niveaux et Butin

- **Points d'expérience (XP)** : À chaque victoire, la totalité de l'XP des monstres vaincus est partagée équitablement entre les survivants.
- **Passage de niveau** : Un niveau est franchi tous les $500 \times \text{Niveau}$ points d'XP :
  - Augmentation des PV Max : lancer du dé de vie de la classe ($1\text{d}6$, $1\text{d}8$ ou $1\text{d}10$) $+$ Modificateur de Constitution.
  - Nouveaux emplacements de sorts et découverte de nouveaux sorts pour les classes magiques.
  - Déblocage de frappes multiples (**Multi-attaque**) : 2 attaques au niveau 5, 3 attaques au niveau 11, 4 attaques au niveau 20 pour les guerriers.
- **Butin (Loot)** : 
  - 25% de chance de trouver une arme, armure ou bouclier sur un monstre vaincu.
  - Jets de rareté pour les objets magiques (*Commun, Peu commun, Rare, Très rare, Légendaire*).
  - **Auto-équipement intelligent** : Si un objet trouvé améliore strictement la puissance de frappe ou la CA d'un héros, celui-ci s'en équipe immédiatement !

---

## 📖 Manuel du Joueur

### 1. Caractéristiques & Modificateurs

Chaque personnage possède six attributs fondamentaux compris généralement entre 8 et 20. Le modificateur associé s'applique à tous les calculs :

$$\text{Modificateur} = \lfloor \frac{\text{Valeur} - 10}{2} \rfloor$$

- **Force (STR)** : Détermine les dégâts au corps-à-corps et le bonus de toucher des Guerriers, Paladins et monstres.
- **Dextérité (DEX)** : Détermine l'initiative, le bonus de toucher des Rôdeurs et Roublards, et augmente la Classe d'Armure.
- **Constitution (CON)** : Détermine le gain de PV à chaque niveau et les jets de sauvegarde contre le poison/épuisement.
- **Intelligence (INT)** : Caractéristique d'incantation du Magicien (détermine son bonus d'attaque magique et son DD de sort).
- **Sagesse (WIS)** : Caractéristique d'incantation du Prêtre et du Druide.
- **Charisme (CHA)** : Caractéristique d'incantation du Barde, de l'Ensorceleur et du Paladin.

---

### 2. Déroulement d'un Combat

1. Cliquez sur **🐉 Nouvelle Rencontre** pour générer des monstres dont le niveau s'adapte au niveau moyen de votre groupe.
2. Observez la **bannière de tour** : elle indique qui doit agir.
   - **Tour d'un monstre** : L'intelligence artificielle résout automatiquement l'attaque du monstre (qui vise en priorité les cibles de première ligne).
   - **Tour d'un de vos héros** : La carte du héros s'illumine en **ambre**. C'est à vous de jouer !
3. **Sélectionner une cible** : Cliquez sur n'importe quelle carte de monstre ou d'allié. La cible active est encadrée d'une **bordure bleue**.
4. **Choisir une action** :
   - Cliquez sur **⚔️ Melee Attack** pour attaquer le monstre ciblé avec votre arme.
   - Ou cliquez sur l'un des boutons de sorts disponibles dans le panneau d'action.
5. Une fois l'action effectuée, le tour passe au combattant suivant dans l'ordre d'initiative jusqu'à la victoire ou la défaite.

---

### 3. Utilisation des Sorts

- Les sorts bénéfiques (soins, boucliers, résurrections) sont signalés par une icône **💚** et ciblent vos **alliés**.
- Les sorts offensifs (boules de feu, éclairs, projectiles magiques) sont signalés par une icône **🔥** et ciblent les **monstres**.
- Chaque bouton de sort affiche le **Niveau du sort** ainsi que le ratio de fentes restantes, par ex. `(2/3)` signifie 2 fentes disponibles sur un maximum de 3 pour ce niveau.
- Les sorts multi-cibles (*AOE*) s'appliquent automatiquement à l'ensemble des cibles valides sans nécessiter de sélection individuelle.

---

### 4. Gestion de l'Inventaire & Équipement

Vous pouvez ouvrir la fiche détaillée d'un personnage à tout moment en effectuant un **double-clic sur sa carte** ou en cliquant sur l'icône **ℹ️ (Info)**.

Dans l'onglet **Inventaire** :
- **Équiper** : Cliquez sur une arme, armure ou bouclier de l'inventaire puis sur le bouton vert **Équiper**. La CA et les dégâts se recalculent immédiatement.
- **Déséquiper** : Retire l'objet actuellement porté pour revenir à l'état de base (mains nues pour les armes, vêtements simples pour l'armure).
- **Boire / Utiliser (Potions & Consommables)** :
  - *Potion of Healing* : Rend instantanément des PV au personnage.
  - *Élixirs de purification* : Guérissent immédiatement les états négatifs (paralysie, aveuglement, sommeil...).
  - Les consommables sont automatiquement décomptés de l'inventaire après usage.
- **Transférer** : Sélectionnez un objet non équipé, choisissez un compagnon dans le menu déroulant, puis cliquez sur **Transférer**.
- **Supprimer** : Permet de détruire un objet superflu de l'inventaire.

---

### 5. Formation, Repos et Sauvegardes

- **Formation (Bouton Formation / 🔀)** :
  - Ouvre une boîte de dialogue permettant de monter ou descendre la position des héros dans le groupe.
  - **Les 3 premiers héros** forment la **Première Ligne (Front-line)** et encaissent la majorité des attaques directes des monstres.
  - **Les 3 suivants** sont placés en **Arrière-Garde (Back-line)**, position idéale pour les jeteurs de sorts et personnages plus fragiles.
- **Repos Complet (Bouton 🏕️ Repos complet)** :
  - Reconstitue 100% des points de vie de tous les aventuriers.
  - Recharge l'intégralité des emplacements de sorts à leur valeur maximale.
  - Dissipe toutes les afflictions et effets temporaires.
- **Sauvegarde & Restauration (Boutons 💾, ⬇️, ⬆️)** :
  - Le bouton **Sauvegarder** enregistre manuellement l'état du groupe.
  - Le bouton **Télécharger (⬇️)** exporte un fichier JSON autonome `rpg_savegame.json`.
  - Le bouton **Charger (⬆️)** permet de restaurer une sauvegarde précédente en téléversant votre fichier JSON.

---

### 6. Mode Simulation Batch

Accessible via le bouton supérieur **Mode Simulation Batch** :

1. Choisissez le nombre de combats (de 10 à 1 000).
2. Définissez la fréquence des pauses à l'auberge (ex : repos tous les 20 combats).
3. Cliquez sur **Lancer la Simulation**.
4. Le moteur exécute les rounds en quelques millisecondes et produit :
   - Le taux de victoire du groupe.
   - Le volume total d'ennemis tués et de sorts lancés.
   - La progression finale du groupe (niveaux atteints, PV, or et sorts appris).
   - Les statistiques de mortalité des monstres par niveau (de Lvl 1 à 20).
   - Les statistiques d'incantation des sorts par niveau (de Lvl 1 à 9).
5. Vous pouvez cliquer sur **« Jouer avec ce groupe dans l'arène »** pour importer directement le groupe résultant de la simulation dans votre partie interactive !

---

## 🗃️ Fichiers de Données & Extensibilité

Toutes les règles et données du jeu sont déclarées dans le dossier `data/` (et synchronisées dans `src/data/`) sous forme de fichiers JSON standards :

- `heroes.json` : Modèles de héros de départ (caractéristiques, classe, équipement).
- `monsters.json` : Bestiaire complet avec dés de vie, CA et dés de dégâts.
- `classes.json` : Définitions des classes (dé de vie, slots de base, caractéristique de sort).
- `races.json` : Races et modificateurs raciaux.
- `spells.json` : Catalogue complet de sorts par classe avec niveaux, effets et sauvegardes.
- `weapons.json`, `armors.json`, `shields.json` : Liste des équipements et propriétés chiffrées.
- `magic_items.json` & `magic_config.json` : Objets magiques, raretés et coefficients de drop.

Vous pouvez facilement étendre le jeu en ajoutant de nouveaux monstres, armes ou sorts directement dans ces fichiers JSON sans modifier le code source du moteur.

---

## 🚀 Lancement & Développement Local

Pour exécuter le projet en local :

```bash
# 1. Installation des dépendances
npm install

# 2. Démarrage du serveur de développement (port 3000)
npm run dev

# 3. Validation TypeScript & Linting
npm run lint

# 4. Compilation de production
npm run build
```

Accédez ensuite à l'application dans votre navigateur sur `http://localhost:3000`.
