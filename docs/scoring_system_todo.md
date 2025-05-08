# Todo List - Implémentation du Système de Scoring

Cette liste détaille les tâches à accomplir pour implémenter les améliorations du système de scoring des plugins MysteryAI. Cochez les tâches au fur et à mesure de leur réalisation.

## API de Scoring Standardisée

### Paramètres utilisateur

- [x] **Ajouter un paramètre d'activation global**
  - [x] Ajouter l'option "Activer le scoring automatique" dans la page des paramètres généraux
  - [x] Mettre à jour le contrôleur JavaScript pour gérer le nouveau paramètre
  - [x] Implémenter la gestion de ce paramètre côté serveur (routes et modèles)
  - [x] Ajouter la vérification de ce paramètre avant d'appliquer le scoring

### Endpoint `/api/plugins/score`

- [x] **Définir la spécification de l'API**
  - [x] Documenter les paramètres d'entrée (texte, mode, contexte)
  - [x] Documenter le format de sortie (score, métadonnées, détails)
  - [x] Définir les codes d'erreur et messages associés

- [x] **Développer le service backend**
  - [x] Créer le fichier de service `scoring_service.py`
  - [x] Implémenter la logique de base du scoring
  - [x] Ajouter le système de validation des entrées
  - [ ] Développer les tests unitaires
    - [ ] Tester la détection de langue
    - [ ] Tester le calcul des scores Zipf
    - [ ] Tester différentes combinaisons de paramètres

- [x] **Intégration avec les plugins existants**
  - [x] Créer la route API `/api/plugins/score`
  - [x] Modifier la classe `PluginManager` pour utiliser le nouveau service
  - [x] Mettre à jour les plugins existants qui utilisent le scoring
    - [x] Modifier le plugin Caesar Code pour utiliser le nouveau système de scoring

### Extension `plugin.json`

- [x] **Spécification du schéma**
  - [x] Définir la structure du champ `scoring_method`
  - [x] Documenter les options et valeurs par défaut
  - [ ] Créer un schéma JSON pour la validation

- [x] **Mise à jour du parser de configuration**
  - [x] Adapter le code qui charge les fichiers `plugin.json`
  - [x] Implémenter la logique de fusion avec les paramètres par défaut
  - [ ] Ajouter la validation du nouveau schéma

## Détection et Traitement du Texte

- [x] **Normalisation de texte avancée**
  - [x] Conversion majuscules → minuscules pour détection de langue
  - [x] Traitement des espaces et caractères spéciaux
  - [x] Génération de candidats avec différentes normalisations
  - [ ] Gestion des caractères accentués et diacritiques

- [x] **Détection de langue robuste**
  - [x] Intégration de langdetect pour l'identification de langue
  - [x] Implémentation de règles spécifiques français/anglais
  - [x] Mécanisme de fallback quand le score est faible
  - [ ] Optimisation pour textes courts

- [x] **Segmentation de texte**
  - [x] Intégration de wordninja pour segmenter les textes sans espaces
  - [x] Optimisation des performances de segmentation
  - [ ] Ajout de segmenteurs spécifiques pour langues agglutinantes

- [x] **Analyse de fréquence Zipf**
  - [x] Intégration de wordfreq pour calculer les fréquences des mots
  - [x] Ajustement des scores pour éviter de survaloriser les mots très communs
  - [x] Inclusion des statistiques Zipf dans les métadonnées
  - [ ] Optimisation des performances avec mise en cache des fréquences
  - [ ] Affinage des seuils d'ajustement par analyse statistique
  - [ ] Extension du support Zipf à plus de langues

## Contextualisation par Géocache

- [ ] **Structure des paramètres de contexte**
  - [ ] Définir la structure JSON pour les coordonnées de géocache
  - [ ] Spécifier les paramètres optionnels supplémentaires (région, langue)
  - [ ] Documenter l'utilisation des paramètres de contexte

- [ ] **Implémentation de la logique de proximité**
  - [ ] Développer la fonction de calcul de distance entre coordonnées
  - [ ] Définir les seuils de proximité et leur impact sur le score
  - [ ] Implémenter la pondération basée sur la distance

- [x] **Adaptation linguistique régionale**
  - [x] Créer une carte des langues par région géographique
  - [x] Développer la logique de priorisation des langues
  - [ ] Tester avec des jeux de données multilingues

## Extension du Format de Sortie

- [x] **Enrichissement des métadonnées**
  - [x] Définir la structure complète des métadonnées de scoring
  - [x] Implémenter la collecte des mots reconnus
  - [x] Ajouter le calcul de confiance linguistique
  - [x] Intégrer les métadonnées Zipf (min, max, moyenne, détails par mot)
  - [ ] Développer la génération d'explications automatiques

- [ ] **Compatibilité avec l'API existante**
  - [ ] Assurer la rétrocompatibilité avec les anciens formats
  - [ ] Créer des adaptateurs pour les plugins non mis à jour
  - [ ] Mettre à jour la documentation API

- [ ] **Tests d'intégration**
  - [x] Créer des scénarios de test pour différentes langues et formats
  - [ ] Vérifier la cohérence des métadonnées générées
  - [ ] Comparer les performances avec l'ancien système

## Optimisations Techniques

- [x] **Appel direct au service de scoring**
  - [x] Implémenter un appel direct au service de scoring dans le plugin Caesar Code 
  - [x] Ajouter un système de fallback vers l'API en cas d'échec
  - [ ] Étendre cette approche à tous les autres plugins

- [ ] **Cache distribué**
  - [ ] Configurer Redis pour le stockage des modèles linguistiques
  - [ ] Implémenter la logique de mise en cache des filtres de Bloom
  - [ ] Développer la stratégie d'invalidation du cache

- [x] **Préchargement intelligent**
  - [x] Implémenter la détection de localisation
  - [x] Développer la logique de préchargement prioritaire
  - [ ] Optimiser la gestion mémoire des modèles

- [x] **Expressions régulières optimisées**
  - [x] Identifier tous les formats de coordonnées GPS à détecter
  - [x] Implémenter des regex plus robustes et flexibles
  - [x] Améliorer la détection des faux positifs (nord-est, etc.)

- [x] **Filtres de Bloom adaptatifs**
  - [x] Développer le mécanisme d'ajustement dynamique
  - [x] Implémenter la collecte de statistiques d'utilisation
  - [x] Créer un outil de génération de filtres de Bloom

## Interface Utilisateur Améliorée

- [ ] **Visualisation interactive des scores**
  - [ ] Concevoir les composants de graphiques radar
  - [ ] Développer le système de code couleur pour le texte
  - [ ] Implémenter les animations de calcul en temps réel

- [ ] **Explication visuelle du scoring**
  - [ ] Créer le composant de surlignage de mots
  - [ ] Développer la visualisation des motifs GPS
  - [ ] Implémenter l'indicateur de seuils de confiance

- [ ] **Intégration avec GoldenLayout**
  - [ ] Adapter les composants pour l'intégration
  - [ ] Développer les événements de communication inter-composants
  - [ ] Optimiser les performances de rendu

## Tests et Validation

- [ ] **Jeux de données de test**
  - [x] Créer des cas de test pour les différentes langues
  - [ ] Compiler une collection de textes cryptés avec solution connue
  - [ ] Créer des scénarios de test spécifiques au géocaching
  - [ ] Développer des benchmarks de performance
  - [ ] Créer des tests de validation pour le scoring Zipf

- [ ] **Tests A/B sur le scoring**
  - [ ] Mettre en place l'infrastructure de test
  - [ ] Définir les métriques d'évaluation
  - [ ] Analyser les résultats et ajuster les paramètres

- [ ] **Documentation utilisateur**
  - [x] Mettre à jour la documentation technique du système
  - [ ] Créer un guide d'utilisation pour les utilisateurs finaux
  - [ ] Documenter l'interprétation des scores
  - [ ] Fournir des exemples pour les cas d'utilisation courants

## Déploiement et Maintenance

- [ ] **Plan de déploiement progressif**
  - [ ] Définir les phases de déploiement
  - [ ] Créer le plan de rollback en cas de problème
  - [ ] Préparer les annonces aux utilisateurs

- [ ] **Monitoring et logging**
  - [x] Implémenter la journalisation détaillée du scoring
  - [ ] Configurer les alertes en cas d'anomalies
  - [ ] Développer les tableaux de bord d'analyse

- [ ] **Boucle de feedback**
  - [ ] Créer le mécanisme de collecte de feedback
  - [ ] Mettre en place l'analyse des résultats
  - [ ] Définir le processus d'amélioration continue 
  - [ ] Collecter des données d'usage pour affiner les seuils Zipf 