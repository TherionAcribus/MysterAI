import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { usePlugin, Plugin, PluginInputs } from '../../hooks/usePlugin';
import { Model } from 'flexlayout-react';
import { RootState } from '../../store';
import { setState } from '../../store/slices/componentsSlice';
import { createSelector } from '@reduxjs/toolkit';

const Container = styled.div`
  padding: ${props => props.theme.spacing.lg};
  height: 100%;
  overflow: auto;
`;

const Header = styled.div`
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const Title = styled.h2`
  margin-bottom: ${props => props.theme.spacing.md};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.xl};
`;

const Description = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: ${props => props.theme.spacing.lg};
  font-size: ${props => props.theme.typography.fontSize.md};
`;

const MetadataSection = styled.div`
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const Badge = styled.span`
  background: ${props => props.theme.colors.primary};
  color: white;
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: ${props => props.theme.typography.fontSize.sm};
  margin-right: ${props => props.theme.spacing.sm};
`;

const InputForm = styled.div`
  margin-top: ${props => props.theme.spacing.xl};
`;

const FormGroup = styled.div`
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${props => props.theme.spacing.sm};
  color: ${props => props.theme.colors.text};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

const Input = styled.input`
  width: 100%;
  padding: ${props => props.theme.spacing.sm};
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
` as any;

Input.defaultProps = {
  accept: "text/plain;charset=utf-8",
  autoComplete: "off",
  spellCheck: "false"
};

const Select = styled.select`
  width: 100%;
  padding: ${props => props.theme.spacing.sm};
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

const TextArea = styled.textarea`
  width: 100%;
  min-height: 150px;
  padding: ${props => props.theme.spacing.sm};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.md};
  font-family: ${props => props.theme.typography.fontFamily.mono};
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primaryLight};
  }
` as any;

TextArea.defaultProps = {
  accept: "text/plain;charset=utf-8",
  autoComplete: "off",
  spellCheck: "false"
};

const Button = styled.button`
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: ${props => props.theme.typography.fontSize.md};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: ${props => props.theme.colors.primaryDark};
  }

  &:disabled {
    background: ${props => props.theme.colors.border};
    cursor: not-allowed;
  }
`;

const ResultSection = styled.div`
  margin-top: ${props => props.theme.spacing.xl};
  padding: ${props => props.theme.spacing.lg};
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
`;

const ResultTitle = styled.h3`
  margin-bottom: ${props => props.theme.spacing.md};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.lg};
`;

const ResultValue = styled.pre`
  margin: 0;
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.backgroundDark};
  border-radius: ${props => props.theme.borderRadius.sm};
  color: ${props => props.theme.colors.text};
  font-family: ${props => props.theme.typography.fontFamily.mono};
  font-size: ${props => props.theme.typography.fontSize.sm};
  white-space: pre-wrap;
  word-break: break-all;
`;

const BruteforceResult = styled.div`
  margin-bottom: ${props => props.theme.spacing.md};
  padding: ${props => props.theme.spacing.sm};
  background: ${props => props.theme.colors.backgroundDark};
  border-radius: ${props => props.theme.borderRadius.sm};
  border: 1px solid ${props => props.theme.colors.border};

  .shift {
    color: ${props => props.theme.colors.primary};
    font-weight: bold;
    margin-right: ${props => props.theme.spacing.sm};
  }

  .text {
    font-family: ${props => props.theme.typography.fontFamily.mono};
  }
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.colors.error};
  margin-top: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.sm};
  background: ${props => props.theme.colors.errorBackground};
  font-size: ${props => props.theme.typography.fontSize.md};
`;

const CoordinatesSection = styled.div`
  margin-top: ${props => props.theme.spacing.md};
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.success}15;
  border: 1px solid ${props => props.theme.colors.success};
  border-radius: ${props => props.theme.borderRadius.md};
  color: ${props => props.theme.colors.success};
`;

const CoordinatesInput = styled(Input)`
  font-family: monospace;
`;

const CoordinatesFormGroup = styled(FormGroup)`
  margin-top: ${props => props.theme.spacing.lg};
  padding-top: ${props => props.theme.spacing.lg};
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const CoordinatesContainer = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.md};
  align-items: flex-start;
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

interface PluginViewProps {
  model?: Model;
  config: {
    plugin: Plugin;
  };
}

// Create a memoized selector outside the component
const selectComponentState = createSelector(
  [(state: RootState) => state.components, (_: RootState, componentId: string) => componentId],
  (components, componentId) => components[componentId] || {}
);

export const PluginView = React.memo(({ config, model }: PluginViewProps) => {
  const { plugin } = config;
  const { executePlugin, isLoading, error } = usePlugin();
  const dispatch = useDispatch();
  
  // Utiliser un ID unique stable pour ce composant
  const componentId = useMemo(() => `plugin-${plugin.name}-${plugin.version}`, [plugin.name, plugin.version]);
  
  // Récupérer l'état depuis Redux avec le selector mémoïsé
  const persistedState = useSelector((state: RootState) => selectComponentState(state, componentId));
  
  // Parse metadata_json safely
  const metadata = useMemo(() => {
    try {
      return plugin.metadata_json ? JSON.parse(plugin.metadata_json) : {};
    } catch (err) {
      console.error('Error parsing metadata_json:', err);
      return {};
    }
  }, [plugin.metadata_json]);

  // État initial avec les valeurs par défaut du metadata ou les valeurs persistées
  const [inputs, setInputs] = useState<PluginInputs>(() => {
    if (persistedState.inputs) {
      return persistedState.inputs;
    }

    const initialInputs: PluginInputs = {
      text: '',
      mode: 'decode'
    };
    
    if (metadata.input_types) {
      Object.entries(metadata.input_types).forEach(([key, config]: [string, any]) => {
        if (key !== 'text' && key !== 'mode') {
          initialInputs[key] = config.default?.toString() || '';
        }
      });
    }
    
    return initialInputs;
  });
  
  const [result, setResult] = useState<any>(persistedState.result || null);
  const [coordinates, setCoordinates] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Sauvegarder l'état dans Redux à chaque changement
  const saveState = useCallback((newInputs: PluginInputs, newResult: any = null) => {
    dispatch(setState({
      instanceId: componentId,
      state: {
        inputs: newInputs,
        result: newResult
      }
    }));
  }, [dispatch, componentId]);

  const handleInputChange = useCallback((name: string, value: string) => {
    setInputs(prev => {
      const newInputs = {
        ...prev,
        [name]: value
      };
      saveState(newInputs, result);
      return newInputs;
    });
  }, [saveState, result]);

  const handleExecute = useCallback(async () => {
    try {
      const pluginResult = await executePlugin(plugin, inputs);
      console.log('Plugin result type:', typeof pluginResult);
      console.log('Plugin result:', pluginResult);
      console.log('Plugin result coordinates:', pluginResult.coordinates);
      console.log('Plugin result coordinates exist:', pluginResult.coordinates?.exist);
      setResult(pluginResult);
      saveState(inputs, pluginResult);
    } catch (err) {
      console.error('Error executing plugin:', err);
    }
  }, [executePlugin, plugin, inputs, saveState]);

  const handleCoordinatesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCoordinates(e.target.value);
  }, []);

  const handleCopyCoordinates = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(coordinates);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy coordinates:', err);
    }
  }, [coordinates]);

  useEffect(() => {
    if (result?.coordinates?.exist) {
      setCoordinates(result.coordinates.ddm);
    }
  }, [result]);

  const renderResult = useCallback(() => {
    if (!result) {
      console.log('No result to render');
      return null;
    }

    console.log('Render - Result type:', typeof result);
    console.log('Render - Full result:', result);
    console.log('Render - Result coordinates:', result.coordinates);
    console.log('Render - Coordinates exist:', result.coordinates?.exist);
    console.log('Render - Should show coordinates:', Boolean(result.coordinates?.exist));

    const showCoordinates = Boolean(result.coordinates?.exist);

    return (
      <>
        {showCoordinates && (
          <CoordinatesSection>
            <strong>Coordonnées trouvées:</strong> {result.coordinates.ddm}
          </CoordinatesSection>
        )}
        {result.mode === 'bruteforce' && result.bruteforce_solutions ? (
          <div>
            {result.bruteforce_solutions.map((solution: { decoded_text: string, shift: number }, index: number) => (
              <BruteforceResult key={index}>
                <span className="shift">Shift {solution.shift}:</span>
                <span className="text">{solution.decoded_text}</span>
              </BruteforceResult>
            ))}
          </div>
        ) : (
          <ResultValue>
            {result.text_output || (typeof result === 'string' ? result : JSON.stringify(result, null, 2))}
          </ResultValue>
        )}
      </>
    );
  }, [result]);

  return (
    <Container>
      <Header>
        <Title>{plugin.name}</Title>
        <Description>{plugin.description}</Description>
        <MetadataSection>
          <Badge>v{plugin.version}</Badge>
          <Badge>{plugin.category}</Badge>
        </MetadataSection>
      </Header>

      <InputForm>
      
        {metadata.input_types && Object.entries(metadata.input_types).map(([fieldName, fieldConfig]: [string, any]) => {
          if (fieldName === 'text') return null;
          
          const fieldLabel = fieldConfig.label || fieldName;
          const fieldType = fieldConfig.type || 'string';
          const fieldValue = inputs[fieldName] ?? fieldConfig.default?.toString() ?? '';

          switch (fieldType) {
            case 'textarea':
              return (
                <FormGroup key={fieldName}>
                  <Label>{fieldLabel}</Label>
                  <TextArea
                    value={fieldValue}
                    placeholder={fieldConfig.placeholder || ''}
                    onChange={(e) => handleInputChange(fieldName, e.target.value)}
                  />
                </FormGroup>
              );

            case 'select':
              return (
                <FormGroup key={fieldName}>
                  <Label>{fieldLabel}</Label>
                  <Select
                    value={fieldValue}
                    onChange={(e) => handleInputChange(fieldName, e.target.value)}
                  >
                    {(fieldConfig.options || []).map((option: any) => (
                      <option key={option} value={option.toString()}>
                        {option.toString()}
                      </option>
                    ))}
                  </Select>
                </FormGroup>
              );

            case 'number':
              return (
                <FormGroup key={fieldName}>
                  <Label>{fieldLabel}</Label>
                  <Input
                    type="number"
                    step={fieldConfig.step}
                    min={fieldConfig.min}
                    max={fieldConfig.max}
                    value={fieldValue}
                    onChange={(e) => handleInputChange(fieldName, e.target.value)}
                  />
                </FormGroup>
              );

            default:
              return (
                <FormGroup key={fieldName}>
                  <Label>{fieldLabel}</Label>
                  <Input
                    value={fieldValue}
                    placeholder={fieldConfig.placeholder || ''}
                    onChange={(e) => handleInputChange(fieldName, e.target.value)}
                  />
                </FormGroup>
              );
          }
        })}
        
        <FormGroup>
          <Label>Texte à traiter</Label>
          <TextArea
            value={inputs.text}
            onChange={(e) => handleInputChange('text', e.target.value)}
            placeholder="Entrez le texte à traiter..."
          />
        </FormGroup>

        <Button
          onClick={handleExecute}
          disabled={isLoading}
        >
          {isLoading ? 'Exécution...' : 'Exécuter'}
        </Button>
      </InputForm>

      {error && (
        <ErrorMessage>{error}</ErrorMessage>
      )}

      {result && (
        <>
          <ResultSection>
            <Label>Résultat</Label>
            <ResultValue>
              {result.text_output || (typeof result === 'string' ? result : JSON.stringify(result, null, 2))}
            </ResultValue>
          </ResultSection>

          <CoordinatesFormGroup>
            <Label>Coordonnées</Label>
            <CoordinatesContainer>
              <CoordinatesInput
                value={coordinates}
                onChange={handleCoordinatesChange}
                placeholder="N XX° XX.XXX' E XXX° XX.XXX'"
              />
              <CopyButton onClick={handleCopyCoordinates}>
                {copySuccess ? '✓ Copié' : 'Copier'}
              </CopyButton>
            </CoordinatesContainer>
          </CoordinatesFormGroup>
        </>
      )}
    </Container>
  );
}, (prevProps, nextProps) => {
  // Comparaison personnalisée pour React.memo
  return (
    prevProps.config.plugin.name === nextProps.config.plugin.name &&
    prevProps.config.plugin.version === nextProps.config.plugin.version &&
    prevProps.config.plugin.metadata_json === nextProps.config.plugin.metadata_json
  );
});