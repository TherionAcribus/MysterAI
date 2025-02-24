import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';

interface GeocacheAnalysisProps {
  config: {
    geocacheId: string;
    gc_code: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
}

const Container = styled.div`
  padding: ${props => props.theme.spacing.md};
  height: 100%;
  overflow-y: auto;
`;

const Title = styled.h2`
  margin-bottom: ${props => props.theme.spacing.md};
  color: ${props => props.theme.colors.text};
`;

const AnalysisSection = styled.div`
  background: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${props => props.theme.borderRadius};
  padding: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};
`;

const InterestingResult = styled.div<{ $hasContent: boolean }>`
  background: ${props => props.$hasContent ? props.theme.colors.success + '20' : 'transparent'};
  border-left: 4px solid ${props => props.$hasContent ? props.theme.colors.success : props.theme.colors.border};
  padding: ${props => props.theme.spacing.sm};
  margin: ${props => props.theme.spacing.sm} 0;
`;

const CoordinatesSection = styled.div`
  background: ${props => props.theme.colors.info + '20'};
  border: 1px solid ${props => props.theme.colors.info};
  border-radius: ${props => props.theme.borderRadius};
  padding: ${props => props.theme.spacing.md};
  margin-top: ${props => props.theme.spacing.md};
`;

const PluginTitle = styled.h3`
  color: ${props => props.theme.colors.primary};
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const ResultItem = styled.div`
  margin: ${props => props.theme.spacing.xs} 0;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: ${props => props.theme.spacing.lg};
  color: ${props => props.theme.colors.textMuted};
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.colors.error};
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.errorBg};
  border-radius: ${props => props.theme.borderRadius};
  margin-bottom: ${props => props.theme.spacing.md};
`;

const CoordinatesContainer = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.md};
  align-items: flex-start;
`;

const CoordinatesFormGroup = styled.div`
  margin-top: ${props => props.theme.spacing.lg};
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.info + '10'};
  border: 1px solid ${props => props.theme.colors.info};
  border-radius: ${props => props.theme.borderRadius.sm};
`;

const CoordinatesInput = styled.input`
  width: 100%;
  padding: ${props => props.theme.spacing.sm};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-family: monospace;
  font-size: ${props => props.theme.typography.fontSize.md};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primaryLight};
  }
`;

const CopyButton = styled.button`
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.secondary};
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.sm};
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};

  &:hover {
    background: ${props => props.theme.colors.secondaryDark};
  }

  &:active {
    transform: translateY(1px);
  }
`;

const ValidateButton = styled.button`
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.success};
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.sm};
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};

  &:hover {
    background: ${props => props.theme.colors.successDark};
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

const ButtonGroup = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
  margin-top: ${props => props.theme.spacing.md};
`;

const SaveButton = styled.button`
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.sm};
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};

  &:hover {
    background: ${props => props.theme.colors.primaryDark};
  }

  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    background: ${props => props.theme.colors.border};
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.div<{ $type: 'success' | 'error' }>`
  color: ${props => props.$type === 'success' ? props.theme.colors.success : props.theme.colors.error};
  font-size: ${props => props.theme.typography.fontSize.sm};
  margin-top: ${props => props.theme.spacing.sm};
`;

const NoResultMessage = styled.div`
  color: ${props => props.theme.colors.textMuted};
  font-style: italic;
  padding: ${props => props.theme.spacing.sm};
  background: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${props => props.theme.borderRadius.sm};
  margin-top: ${props => props.theme.spacing.sm};
`;

export const GeocacheAnalysis: React.FC<GeocacheAnalysisProps> = ({ config }) => {
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // État pour l'API electron
  const [electronAPI, setElectronAPI] = useState<Window['electron'] | null>(null);

  // Initialiser l'API electron
  useEffect(() => {
    const initElectron = () => {
      if (window.electron) {
        console.log('Initializing electron API');
        setElectronAPI(window.electron);
      } else {
        console.warn('Electron API not available, retrying in 500ms');
        setTimeout(initElectron, 500);
      }
    };

    initElectron();
  }, []);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);

        const pluginResponse = await fetch(`/api/plugins/analysis_web_page/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            geocache_id: config.geocacheId
          })
        });

        if (!pluginResponse.ok) {
          const errorData = await pluginResponse.json();
          throw new Error(errorData.error || 'Erreur lors de l\'analyse de la géocache');
        }

        const data = await pluginResponse.json();
        setAnalysisResults(data);
      } catch (err) {
        console.error('Error in analysis:', err);
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    if (config.geocacheId) {
      fetchAnalysis();
    }
  }, [config.geocacheId]);

  const handleCopyCoordinates = async (coordinates: string) => {
    try {
      await navigator.clipboard.writeText(coordinates);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy coordinates:', err);
    }
  };

  const handleSaveCoordinates = async (coordinates: any) => {
    if (!config.geocacheId || !coordinates?.exist) return;

    try {
      const coordsToSave = {
        gc_lat_corrected: coordinates.ddm_lat,
        gc_lon_corrected: coordinates.ddm_lon,
      };

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
  };

  const handleValidateOnGeocaching = async (coordinates: any) => {
    if (!config.geocacheId || !coordinates?.exist) return;

    try {
      if (!electronAPI) {
        console.error('Electron API not available');
        throw new Error('Electron API not available - Please wait a moment and try again');
      }

      if (!config.gc_code) {
        throw new Error('Code GC non disponible');
      }

      console.log('Fetching geocaching credentials...');
      // Récupérer les identifiants
      const credentials = await fetch('/api/geocaching_com/credentials').then(r => r.json());
      
      console.log('Opening validation window for cache:', config.gc_code);

      // Ouvrir une nouvelle fenêtre pour geocaching.com
      electronAPI.send('validate-geocaching', {
        url: `https://coord.info/${config.gc_code}`,
        data: {
          coordinates: coordinates.ddm,
          credentials
        }
      });

      setValidationSuccess(true);
      setValidationError(null);
      setTimeout(() => setValidationSuccess(false), 2000);
    } catch (err) {
      console.error('Error validating coordinates:', err);
      setValidationError(err instanceof Error ? err.message : 'Erreur lors de la validation');
      setValidationSuccess(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingMessage>Analyse en cours...</LoadingMessage>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorMessage>{error}</ErrorMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Title>Analyse de la géocache</Title>
      
      {analysisResults?.combined_results && Object.entries(analysisResults.combined_results).map(([pluginName, result]: [string, any]) => {
        // Vérifier si le plugin a trouvé des informations intéressantes
        const hasInterestingFindings = result?.findings?.some((finding: any) => finding.isInteresting);
        const hasCoordinates = result?.coordinates?.exist;
        const hasResults = result?.findings?.length > 0;

        return (
          <AnalysisSection key={pluginName}>
            <PluginTitle>{pluginName}</PluginTitle>
            
            {result && result.coordinates && result.coordinates.exist && (
              <CoordinatesFormGroup>
                <Label>Coordonnées GPS détectées</Label>
                <CoordinatesContainer>
                  <CoordinatesInput 
                    readOnly 
                    value={result.coordinates.ddm || ''} 
                  />
                  <CopyButton 
                    onClick={() => handleCopyCoordinates(result.coordinates.ddm)}
                    title="Copier les coordonnées"
                  >
                    {copySuccess ? 'Copié !' : 'Copier'}
                  </CopyButton>
                </CoordinatesContainer>
                <ButtonGroup>
                  <SaveButton
                    onClick={() => handleSaveCoordinates(result.coordinates)}
                    disabled={!config.geocacheId || !result.coordinates.exist}
                    title={!config.geocacheId ? "Aucune géocache associée" : "Sauvegarder les coordonnées"}
                  >
                    {saveSuccess ? 'Sauvegardé !' : 'Sauvegarder'}
                  </SaveButton>
                  <ValidateButton
                    onClick={() => handleValidateOnGeocaching(result.coordinates)}
                    disabled={!config.geocacheId || !result.coordinates.exist}
                    title={!config.geocacheId ? "Aucune géocache associée" : "Valider sur geocaching.com"}
                  >
                    {validationSuccess ? 'Validé !' : 'Valider sur GC.com'}
                  </ValidateButton>
                </ButtonGroup>
                {saveError && (
                  <StatusMessage $type="error">{saveError}</StatusMessage>
                )}
                {saveSuccess && (
                  <StatusMessage $type="success">Coordonnées sauvegardées avec succès !</StatusMessage>
                )}
                {validationError && (
                  <StatusMessage $type="error">{validationError}</StatusMessage>
                )}
                {validationSuccess && (
                  <StatusMessage $type="success">Coordonnées validées avec succès sur geocaching.com !</StatusMessage>
                )}
              </CoordinatesFormGroup>
            )}
            
            {result && result.findings && result.findings.map((finding: any, index: number) => (
              <InterestingResult key={index} $hasContent={finding.isInteresting}>
                <ResultItem>
                  <strong>{finding.type}:</strong> {finding.content}
                  {finding.description && (
                    <div><em>{finding.description}</em></div>
                  )}
                </ResultItem>
              </InterestingResult>
            ))}

            {hasResults && !hasInterestingFindings && !hasCoordinates && (
              <NoResultMessage>
                Aucune information intéressante n'a été trouvée par ce plugin.
              </NoResultMessage>
            )}

            {!hasResults && (
              <NoResultMessage>
                Ce plugin n'a trouvé aucun résultat à analyser.
              </NoResultMessage>
            )}
          </AnalysisSection>
        );
      })}
    </Container>
  );
};
