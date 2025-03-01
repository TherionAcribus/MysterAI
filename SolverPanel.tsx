import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { TabNode } from 'flexlayout-react';
import { FaPlus, FaTimes, FaPlay, FaTrash, FaSearch, FaChevronDown, FaChevronRight, FaCheck } from 'react-icons/fa';
import { getPlugins, organizePluginsByCategory } from '../../services/pluginsService';
import { usePlugin, Plugin, PluginInputs } from '../../hooks/usePlugin';
import { RootState } from '../../store';
import { setState } from '../../store/slices/componentsSlice';
import { updateCoordinates } from '../../store/slices/coordinatesSlice';
import { cloneDeep } from 'lodash';
import { createSelector } from '@reduxjs/toolkit';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: ${props => props.theme.spacing.lg};
`;

const SearchContainer = styled.div`
  margin-bottom: ${props => props.theme.spacing.md};
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.sm} ${props => props.theme.spacing.sm} 2.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.md};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primaryLight};
  }
`;

const SearchIcon = styled(FaSearch)`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${props => props.theme.colors.textSecondary};
`;

const CategoryTree = styled.div`
  margin-bottom: ${props => props.theme.spacing.md};
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  background: ${props => props.theme.colors.background};
`;

const CategoryItem = styled.div<{ $isSelected: boolean }>`
  padding: ${props => props.theme.spacing.sm};
  cursor: pointer;
  display: flex;
  align-items: center;
  color: ${props => props.theme.colors.text};
  background: ${props => props.$isSelected ? props.theme.colors.primaryLight : 'transparent'};
  border-radius: ${props => props.theme.borderRadius.sm};

  &:hover {
    background: ${props => props.$isSelected ? props.theme.colors.primaryLight : props.theme.colors.backgroundLight};
  }
`;

const ChevronIcon = styled.span`
  margin-right: ${props => props.theme.spacing.sm};
  width: 1rem;
  display: inline-flex;
  align-items: center;
`;

const PluginItem = styled.div<{ depth: number, isSelected: boolean }>`
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.sm} ${props => props.theme.spacing.sm} ${props => `${props.depth * 1.5 + 2.25}rem`};
  cursor: pointer;
  color: ${props => props.theme.colors.text};
  background: ${props => props.isSelected ? props.theme.colors.primaryLight : 'transparent'};
  
  &:hover {
    background: ${props => props.isSelected ? props.theme.colors.primaryLight : props.theme.colors.backgroundLight};
  }
`;

const TextAreaContainer = styled.div<{ height?: string }>`
  min-height: ${props => props.height || '100px'};
  max-height: 300px;
  resize: vertical;
  overflow: hidden;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  display: flex;
  flex-direction: column;
`;

const StyledTextArea = styled.textarea`
  width: 100%;
  height: 100%;
  min-height: 100px;
  padding: ${props => props.theme.spacing.sm};
  background: ${props => props.theme.colors.background};
  border: none;
  color: ${props => props.theme.colors.text};
  resize: none;
  font-family: inherit;
  
  &:focus {
    outline: none;
  }
`;

const PluginsContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  background: ${props => props.theme.colors.background};
`;

const CategoryTitle = styled.h3`
  margin: ${props => props.theme.spacing.md};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.md};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
`;

const PluginName = styled.h4`
  margin: 0 0 ${props => props.theme.spacing.xs};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.md};
`;

const PluginDescription = styled.p`
  margin: 0;
  color: ${props => props.theme.colors.textSecondary};
  font-size: ${props => props.theme.typography.fontSize.sm};
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.md};
`;

const Button = styled.button<{ variant?: 'danger' | 'primary' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.sm};
  background: ${props => props.variant === 'danger' ? props.theme.colors.error : props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  gap: ${props => props.theme.spacing.sm};

  &:hover {
    background: ${props => props.variant === 'danger' 
      ? props.theme.colors.errorDark 
      : props.theme.colors.secondary};
  }
`;

const PluginContainer = styled.div`
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.background};
  margin-bottom: ${props => props.theme.spacing.md};
`;

const PluginHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const PluginTitleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

const BruteforceCheckbox = styled.input`
  margin: 0;
  cursor: pointer;
`;

const PluginTitle = styled.h4`
  margin: 0;
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.md};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.sm};
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${props => props.theme.colors.backgroundLight};
  }
`;

const SaveButton = styled(Button)`
  background: ${props => props.theme.colors.success};

  &:hover {
    background: ${props => props.theme.colors.successDark};
  }
`;

const ValidateButton = styled(Button)`
  background: ${props => props.theme.colors.success};
  color: white;
  &:hover {
    background: ${props => props.theme.colors.successDark};
  }
  &:disabled {
    background: ${props => props.theme.colors.disabled};
    cursor: not-allowed;
  }
`;

const PluginSelectorContainer = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.md};
  height: 400px;
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.md};
  overflow: hidden;
`;

const CategoryTreeContainer = styled.div`
  width: 250px;
  border-right: 1px solid ${props => props.theme.colors.border};
  overflow-y: auto;
  padding: ${props => props.theme.spacing.sm};
`;

const PluginListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${props => props.theme.spacing.sm};
`;

const CategoryItemSelector = styled.div<{ isSelected: boolean }>`
  padding: ${props => props.theme.spacing.sm};
  cursor: pointer;
  display: flex;
  align-items: center;
  color: ${props => props.theme.colors.text};
  background: ${props => props.isSelected ? props.theme.colors.primaryLight : 'transparent'};
  border-radius: ${props => props.theme.borderRadius.sm};

  &:hover {
    background: ${props => props.isSelected ? props.theme.colors.primaryLight : props.theme.colors.backgroundLight};
  }
`;

const SearchBar = styled.input`
  width: 100%;
  padding: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.md};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  background: ${props => props.theme.colors.background};
`;

const GeocacheInfo = styled.div`
  padding: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${props => props.theme.borderRadius.sm};
  color: ${props => props.theme.colors.textMuted};
  font-size: ${props => props.theme.typography.fontSize.sm};
`;

const GeocacheId = styled.span`
  opacity: 0.7;
  font-size: 0.9em;
`;

const CoordinatesInput = styled.input`
  width: 100%;
  padding: ${props => props.theme.spacing.sm};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.md};
  font-family: monospace;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primaryLight};
  }
`;

const CoordinatesContainer = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.md};
  align-items: flex-start;
`;

const CoordinatesFormGroup = styled.div`
  margin-top: ${props => props.theme.spacing.md};
`;

const CopyButton = styled.button`
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.secondary};
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.sm};
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${props => props.theme.colors.secondaryDark};
  }

  &:active {
    transform: translateY(1px);
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${props => props.theme.spacing.sm};
  color: ${props => props.theme.colors.text};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

const ErrorMessage = styled.p`
  color: ${props => props.theme.colors.error};
  font-size: ${props => props.theme.typography.fontSize.sm};
`;

interface CategoryData {
  [key: string]: {
    [key: string]: string[] | { [key: string]: string[] }
  }
}

interface PluginInstance {
  plugin: Plugin;
  inputs: PluginInputs;
  result: string | any;
  bruteforce?: boolean;
}

interface SolverPanelProps {
  model?: TabNode;
  config?: {
    initialText?: string;
    geocacheId?: number;
    gcCode?: string;
    gc_lat?: string;
    gc_lon?: string;
  };
}

const selectComponentState = createSelector(
  [(state: RootState) => state.components, (_, componentId: string) => componentId],
  (components, componentId) => components[componentId] || {}
);

export const SolverPanel = React.memo(({ model, config }: SolverPanelProps) => {
  const dispatch = useDispatch();
  
  // Créer un ID unique pour ce composant
  const componentId = useMemo(() => 
    `solver-${config?.geocacheId || 'standalone'}-${model?.id || 'default'}`,
    [config?.geocacheId, model?.id]
  );
  
  // Récupérer l'état depuis Redux avec le sélecteur mémorisé
  const persistedState = useSelector((state: RootState) => 
    selectComponentState(state, componentId)
  );
  
  // État local avec persistance Redux
  const [text, setText] = useState(() => persistedState.text || '');
  const [plugins, setPlugins] = useState<Plugin[]>(() => cloneDeep(persistedState.plugins || []));
  const [categories, setCategories] = useState<CategoryData>(() => cloneDeep(persistedState.categories || {}));
  const [searchTerm, setSearchTerm] = useState(() => persistedState.searchTerm || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(() => persistedState.selectedCategory || 'All');
  const [showPluginSelector, setShowPluginSelector] = useState(false);
  const [pluginChain, setPluginChain] = useState<PluginInstance[]>(() => cloneDeep(persistedState.pluginChain || []));
  const [coordinates, setCoordinates] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validateSuccess, setValidateSuccess] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);

  // Ne pas utiliser config.initialText car il peut contenir du HTML
  useEffect(() => {
    if (config?.geocacheId && !persistedState.text) {
      fetch(`/api/geocaches/${config.geocacheId}/text`)
        .then(response => response.json())
        .then(data => {
          const newText = data.description || '';
          setText(newText);
          // Sauvegarder dans Redux
          dispatch(setState({
            instanceId: componentId,
            state: {
              text: newText,
              plugins,
              categories,
              searchTerm,
              selectedCategory,
              pluginChain
            }
          }));
        })
        .catch(error => {
          console.error('Error loading geocache text:', error);
        });
    }
  }, [config?.geocacheId, componentId, dispatch, persistedState.text, plugins, categories, searchTerm, selectedCategory, pluginChain]);

  // Sauvegarder l'état dans Redux
  const saveState = useCallback((newState: any) => {
    dispatch(setState({
      instanceId: componentId,
      state: newState
    }));
  }, [dispatch, componentId]);

  // Mettre à jour l'état persisté à chaque changement important
  useEffect(() => {
    saveState({
      text,
      plugins,
      categories,
      searchTerm,
      selectedCategory,
      pluginChain
    });
  }, [text, plugins, categories, searchTerm, selectedCategory, pluginChain, saveState]);

  const { executePlugin } = usePlugin();

  const loadData = useCallback(async () => {
    try {
      const pluginsList = await getPlugins();
      setPlugins(pluginsList);

      const response = await fetch('/api/categories');
      const data = await response.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  useEffect(() => {
    if (showPluginSelector && plugins.length === 0) {
      loadData();
    }
  }, [showPluginSelector, plugins.length, loadData]);

  const renderCategories = useCallback((categoryData: any, path: string[] = []) => {
    if (!categoryData) return null;
    
    return Object.entries(categoryData).map(([category, subcategories]) => {
      const currentPath = [...path, category];
      const categoryPath = currentPath.join('/');

      return (
        <React.Fragment key={categoryPath}>
          <CategoryItem
            $isSelected={selectedCategory === categoryPath}
            onClick={() => setSelectedCategory(categoryPath)}
          >
            {category}
          </CategoryItem>
          {typeof subcategories === 'object' && (
            <div style={{ marginLeft: '1rem' }}>
              {renderCategories(subcategories, currentPath)}
            </div>
          )}
        </React.Fragment>
      );
    });
  }, [selectedCategory]);

  const getFilteredPlugins = useCallback(() => {
    return plugins.filter(plugin => {
      const matchesSearch = searchTerm === '' ||
        plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plugin.description.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedCategory === 'All') return true;

      const pluginCategories = Array.isArray(plugin.categories)
        ? plugin.categories
        : JSON.parse(plugin.categories || '[]');

      return pluginCategories.some(cat => cat === selectedCategory.split('/').pop());
    });
  }, [plugins, searchTerm, selectedCategory]);

  const handlePluginClick = useCallback((plugin: Plugin) => {
    setShowPluginSelector(false);
    setPluginChain(prevChain => {
      const newInstance: PluginInstance = {
        plugin,
        inputs: {
          text: prevChain.length > 0 ? prevChain[prevChain.length - 1].result : text,
          mode: 'decode'
        },
        result: ''
      };
      return [...prevChain, newInstance];
    });
  }, [text]);

  const handleResultChange = useCallback((index: number, value: string) => {
    setPluginChain(chain => {
      const newChain = cloneDeep(chain);
      newChain[index].result = value;
      for (let i = index + 1; i < newChain.length; i++) {
        newChain[i].inputs.text = newChain[i - 1].result;
      }
      return newChain;
    });
  }, []);

  const handlePluginExecute = useCallback(async (index: number) => {
    try {
      const instance = pluginChain[index];
      const inputs = {
        ...instance.inputs,
        mode: instance.bruteforce ? 'bruteforce' : 'decode'
      };
      const result = await executePlugin(instance.plugin.name, inputs);
      
      setPluginChain(chain => {
        const newChain = cloneDeep(chain);
        newChain[index].result = result;
        for (let i = index + 1; i < newChain.length; i++) {
          newChain[i].inputs.text = newChain[i - 1].result;
        }
        return newChain;
      });
    } catch (error) {
      console.error('Error executing plugin:', error);
    }
  }, [pluginChain, executePlugin]);

  const handleBruteforceChange = useCallback((index: number, checked: boolean) => {
    setPluginChain(chain => {
      const newChain = cloneDeep(chain);
      newChain[index].bruteforce = checked;
      return newChain;
    });
  }, []);

  const handleRemovePlugin = useCallback((index: number) => {
    setPluginChain(chain => {
      const newChain = cloneDeep(chain.filter((_, i) => i !== index));
      for (let i = index; i < newChain.length; i++) {
        newChain[i].inputs.text = i > 0 ? newChain[i - 1].result : text;
      }
      return newChain;
    });
  }, [text]);

  const renderPluginResult = useCallback((instance: PluginInstance) => {
    if (!instance.result) return '';

    if (typeof instance.result === 'string') {
      return instance.result;
    }

    if (instance.result.mode === 'bruteforce' && instance.result.bruteforce_solutions) {
      return instance.result.bruteforce_solutions
        .map((solution: { decoded_text: string, shift: number, previous_shift?: number }) => {
          const shiftInfo = solution.previous_shift 
            ? `[${solution.shift},${solution.previous_shift}]` 
            : `[${solution.shift}]`;
          return `${shiftInfo}: ${solution.decoded_text}`;
        })
        .join('\n');
    }

    if (instance.result.text_output) {
      return instance.result.text_output;
    }

    return JSON.stringify(instance.result, null, 2);
  }, []);

  const updateText = useCallback((newText: string) => {
    setText(newText);
    dispatch(setState({
      instanceId: componentId,
      state: {
        text: newText,
        plugins,
        categories,
        searchTerm,
        selectedCategory,
        pluginChain
      }
    }));
  }, [componentId, dispatch, plugins, categories, searchTerm, selectedCategory, pluginChain]);

  const loadGeocacheText = useCallback(async (geocacheId: number) => {
    try {
      const response = await fetch(`/api/geocaches/${geocacheId}/text`);
      const data = await response.json();
      updateText(data.description || '');
    } catch (error) {
      console.error('Error loading geocache text:', error);
    }
  }, [updateText]);

  // Charger le texte de la géocache si un ID est fourni et qu'il n'y a pas de texte persisté
  useEffect(() => {
    if (config?.geocacheId && !persistedState.text) {
      loadGeocacheText(config.geocacheId);
    }
  }, [config?.geocacheId, loadGeocacheText, persistedState.text]);

  const handleCopyCoordinates = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(coordinates);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy coordinates:', err);
    }
  }, [coordinates]);

  const handleCoordinatesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCoordinates(e.target.value);
    
    // Parse DDM coordinates and dispatch to Redux
    if (e.target.value) {
      try {
        const [latPart, lonPart] = e.target.value.split(' ');
        if (latPart && lonPart) {
          const lat = parseDDMToDecimal(latPart);
          const lon = parseDDMToDecimal(lonPart);
          
          if (!isNaN(lat) && !isNaN(lon) && config?.geocacheId) {
            dispatch(updateCoordinates({
              geocacheId: config.geocacheId,
              coordinates: {
                latitude: lat,
                longitude: lon,
                type: 'solver',
                geocacheId: config.geocacheId
              }
            }));
          }
        }
      } catch (error) {
        console.error('Error parsing coordinates:', error);
      }
    }
  }, [dispatch, config?.geocacheId]);

  // Add helper function to parse DDM coordinates
  const parseDDMToDecimal = (ddm: string): number => {
    const direction = ddm.charAt(0);
    const [degrees, minutes] = ddm.slice(2, -1).split('° ');
    const dec = parseFloat(degrees) + parseFloat(minutes) / 60;
    return direction === 'S' || direction === 'W' ? -dec : dec;
  };

  const handleSaveCoordinates = useCallback(async () => {
    if (!config?.geocacheId || !coordinates) return;

    try {
      // Extraire les coordonnées du dernier résultat
      const lastResult = pluginChain.length > 0 ? pluginChain[pluginChain.length - 1].result : null;
      const coordsToSave = lastResult?.coordinates?.exist ? {
        gc_lat_corrected: lastResult.coordinates.ddm_lat,
        gc_lon_corrected: lastResult.coordinates.ddm_lon,
      } : null;

      if (!coordsToSave) {
        setSaveError("Pas de coordonnées valides à sauvegarder");
        return;
      }

      const response = await fetch(`/api/geocaches/${config.geocacheId}/coordinates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...coordsToSave,
          solved: "solved",
          solved_date: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde des coordonnées');
      }

      setSaveSuccess(true);
      setSaveError(null);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Error saving coordinates:', err);
      setSaveError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    }
  }, [config?.geocacheId, coordinates, pluginChain]);

  const handleValidateCoordinates = useCallback(async () => {
    if (!config?.gcCode || !coordinates) return;

    try {
      const response = await window.electron.validateCoordinates({
        gcCode: config.gcCode,
        coordinates: coordinates
      });

      if (response.success) {
        setValidateSuccess(true);
        setValidateError(null);
        setTimeout(() => setValidateSuccess(false), 2000);
      } else {
        throw new Error(response.error || 'Erreur lors de la validation');
      }
    } catch (err) {
      console.error('Error validating coordinates:', err);
      setValidateError(err instanceof Error ? err.message : 'Erreur lors de la validation');
    }
  }, [config?.gcCode, coordinates]);

  // Mettre à jour les coordonnées quand un plugin retourne des coordonnées
  useEffect(() => {
    if (pluginChain.length > 0) {
      const lastResult = pluginChain[pluginChain.length - 1].result;
      if (lastResult?.coordinates?.exist) {
        setCoordinates(lastResult.coordinates.ddm);
        
        // Si on a des coordonnées et un geocacheId, on les envoie aussi dans Redux
        if (config?.geocacheId) {
          try {
            const [latPart, lonPart] = lastResult.coordinates.ddm.split(' ');
            if (latPart && lonPart) {
              const lat = parseDDMToDecimal(latPart);
              const lon = parseDDMToDecimal(lonPart);
              
              dispatch(updateCoordinates({
                geocacheId: config.geocacheId,
                coordinates: {
                  latitude: lat,
                  longitude: lon,
                  type: 'solver',
                  geocacheId: config.geocacheId
                }
              }));
            }
          } catch (error) {
            console.error('Error parsing coordinates from plugin result:', error);
          }
        }
      }
    }
  }, [pluginChain, config?.geocacheId, dispatch]);

  return (
    <Container>
      <GeocacheInfo>
        {config?.geocacheId 
          ? <>Géocache associée : {config.gcCode} <GeocacheId>(ID: {config.geocacheId})</GeocacheId></>
          : "Aucune géocache n'est associée à ce Solver"}
      </GeocacheInfo>
      
      <TextAreaContainer height="150px">
        <StyledTextArea
          value={text}
          onChange={(e) => updateText(e.target.value)}
          placeholder="Entrez votre texte ici..."
        />
      </TextAreaContainer>

      {pluginChain.map((instance, index) => (
        <PluginContainer key={index}>
          <PluginHeader>
            <PluginTitleContainer>
            <PluginTitle>{instance.plugin.name}</PluginTitle>
              <BruteforceCheckbox
                type="checkbox"
                checked={instance.bruteforce || false}
                onChange={(e) => handleBruteforceChange(index, e.target.checked)}
              />Bruteforce
            </PluginTitleContainer>
            <ButtonGroup>
              <IconButton onClick={() => handlePluginExecute(index)}>
                <FaPlay />
              </IconButton>
              <IconButton onClick={() => handleRemovePlugin(index)}>
                <FaTrash />
              </IconButton>
            </ButtonGroup>
          </PluginHeader>
          <TextAreaContainer>
            <StyledTextArea
              value={renderPluginResult(instance) || ''}
              onChange={(e) => handleResultChange(index, e.target.value)}
              placeholder="Résultat..."
            />
          </TextAreaContainer>
        </PluginContainer>
      ))}

      <CoordinatesFormGroup>
        <Label>Coordonnées</Label>
        <CoordinatesContainer>
          <CoordinatesInput
            value={coordinates}
            onChange={handleCoordinatesChange}
            placeholder="N XX° XX.XXX' E XXX° XX.XXX'"
          />
          <ButtonGroup>
            <CopyButton onClick={handleCopyCoordinates}>
              {copySuccess ? '✓ Copié' : 'Copier'}
            </CopyButton>
            {config?.gcCode && (
              <>
                <ValidateButton 
                  onClick={handleValidateCoordinates} 
                  disabled={!coordinates}
                >
                  {validateSuccess ? '✓ Validé' : 'Valider sur GC.com'}
                </ValidateButton>
                {config?.geocacheId && (
                  <SaveButton onClick={handleSaveCoordinates} disabled={!coordinates}>
                    {saveSuccess ? '✓ Sauvegardé' : 'Sauvegarder'}
                  </SaveButton>
                )}
              </>
            )}
          </ButtonGroup>
        </CoordinatesContainer>
        {saveError && (
          <ErrorMessage>{saveError}</ErrorMessage>
        )}
        {validateError && (
          <ErrorMessage>{validateError}</ErrorMessage>
        )}
      </CoordinatesFormGroup>

      {!showPluginSelector ? (
        <Button onClick={() => setShowPluginSelector(true)}>
          <FaPlus />
          Ajouter un plugin
        </Button>
      ) : (
        <>
          <Button onClick={() => setShowPluginSelector(false)}>
            <FaTimes />
            Fermer
          </Button>
          <PluginSelectorContainer>
            <CategoryTreeContainer>
              <CategoryItem
                $isSelected={selectedCategory === 'All'}
                onClick={() => setSelectedCategory('All')}
              >
                All
              </CategoryItem>
              {categories && renderCategories(categories)}
            </CategoryTreeContainer>
            <PluginListContainer>
              <SearchBar
                type="text"
                placeholder="Rechercher un plugin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {getFilteredPlugins().map((plugin) => (
                <PluginItem
                  key={plugin.name}
                  onClick={() => handlePluginClick(plugin)}
                >
                  <PluginName>{plugin.name}</PluginName>
                  <PluginDescription>{plugin.description}</PluginDescription>
                </PluginItem>
              ))}
            </PluginListContainer>
          </PluginSelectorContainer>
        </>
      )}
    </Container>
  );
}, (prevProps, nextProps) => {
  // Comparaison personnalisée pour React.memo
  return (
    prevProps.model?.id === nextProps.model?.id &&
    prevProps.config?.geocacheId === nextProps.config?.geocacheId &&
    prevProps.config?.gcCode === nextProps.config?.gcCode &&
    prevProps.config?.initialText === nextProps.config?.initialText
  );
});
