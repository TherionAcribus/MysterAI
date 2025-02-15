import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AlphabetConfig } from '../../types/alphabet';
import { RootState } from '../../store';
import { setState } from '../../store/slices/componentsSlice';

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
`;

const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: ${props => props.theme.spacing.md};
  margin-top: ${props => props.theme.spacing.lg};
`;

const GridHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${props => props.theme.spacing.md};
`;

const GridTitle = styled.h4`
  margin: 0;
`;

const SizeControls = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
  align-items: center;
`;

const SizeButton = styled.button`
  padding: ${props => props.theme.spacing.sm};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  background: ${props => props.theme.colors.background};
  cursor: pointer;
  
  &:hover {
    background: ${props => props.theme.colors.hover};
  }
`;

const SaveButton = styled(SizeButton)<{ $hasChanges: boolean }>`
  color: ${props => props.$hasChanges ? props.theme.colors.primary : props.theme.colors.textSecondary};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  opacity: ${props => props.$hasChanges ? 1 : 0.5};
  cursor: ${props => props.$hasChanges ? 'pointer' : 'default'};
  
  svg {
    width: 16px;
    height: 16px;
  }
  
  &:hover {
    color: ${props => props.$hasChanges ? props.theme.colors.text : props.theme.colors.textSecondary};
    background: ${props => props.$hasChanges ? props.theme.colors.hover : props.theme.colors.background};
  }
`;

const SaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const CharacterCard = styled.div`
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  padding: ${props => props.theme.spacing.md};
  text-align: center;
  
  &:hover {
    background-color: ${props => props.theme.colors.hover};
  }
`;

const CharacterDisplay = styled.div<{ fontFamily?: string; fontSize?: number }>`
  font-size: ${props => `${props.fontSize || 2}em`};
  margin-bottom: ${props => props.theme.spacing.sm};
  ${props => props.fontFamily && `font-family: ${props.fontFamily};`}
`;

const CharacterLabel = styled.div`
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textSecondary};
`;

const MessageArea = styled.div`
  margin-top: ${props => props.theme.spacing.xl};
  padding: ${props => props.theme.spacing.lg};
  background: ${props => props.theme.colors.backgroundDark};
  border-radius: ${props => props.theme.borderRadius.md};
`;

const MessageSection = styled.div`
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const MessageLabel = styled.h4`
  margin-bottom: ${props => props.theme.spacing.sm};
  color: ${props => props.theme.colors.text};
`;

const MessageTextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.md};
  resize: vertical;
  margin-bottom: ${props => props.theme.spacing.md};
`;

const CodedMessageTextArea = styled(MessageTextArea)`
  font-family: monospace;
  background: ${props => props.theme.colors.backgroundLight};
  color: ${props => props.theme.colors.textSecondary};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.md};
  margin-top: ${props => props.theme.spacing.md};
`;

const Button = styled.button`
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.sm};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};

  &:hover {
    background: ${props => props.theme.colors.primaryDark};
  }

  &:disabled {
    background: ${props => props.theme.colors.disabled};
    cursor: not-allowed;
  }
`;

const SymbolSequence = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.backgroundLight};
  border-radius: ${props => props.theme.borderRadius.sm};
  min-height: 100px;
  align-items: center;
`;

const SymbolItem = styled.div<{ isDragging?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.sm};
  background: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius.xs};
  width: 50px;
  height: 50px;
  position: relative;
  cursor: move;
  user-select: none;
  transform: ${props => props.isDragging ? 'scale(1.05)' : 'scale(1)'};
  box-shadow: ${props => props.isDragging ? '0 5px 10px rgba(0,0,0,0.15)' : 'none'};
  transition: transform 0.2s, box-shadow 0.2s;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
  }

  span {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5em;
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
  }
`;

const ContextMenu = styled.div`
  position: fixed;
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  padding: ${props => props.theme.spacing.sm};
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
`;

const MenuItem = styled.div`
  padding: ${props => props.theme.spacing.sm};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};

  &:hover {
    background: ${props => props.theme.colors.backgroundLight};
  }
`;

const DroppableContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.backgroundLight};
  border-radius: ${props => props.theme.borderRadius.sm};
  min-height: 100px;
  align-items: center;
`;

const MessageText = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.md};
  resize: vertical;
  margin-bottom: ${props => props.theme.spacing.md};
`;

interface AlphabetViewProps {
  config: {
    plugin: {
      alphabetConfig: AlphabetConfig;
      id: string;
      name: string;
      description: string;
    };
  };
}

interface SymbolEntry {
  char: string;
  type: 'font' | 'image';
  imagePath?: string;
}

interface ContextMenuPosition {
  x: number;
  y: number;
  symbolIndex: number;
}

const DraggableSymbol: React.FC<{ 
  symbol: SymbolEntry; 
  index: number; 
  moveSymbol: (dragIndex: number, hoverIndex: number) => void; 
  fontSize?: number; 
  alphabet: any;
  onContextMenu?: (e: React.MouseEvent, index: number) => void;
}> = ({ symbol, index, moveSymbol, fontSize, alphabet, onContextMenu }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [, drop] = useDrop({
    accept: 'symbol',
    hover(item: { index: number }) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      moveSymbol(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'symbol',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div 
      ref={ref} 
      style={{ opacity: isDragging ? 0.5 : 1 }}
      onContextMenu={(e) => onContextMenu && onContextMenu(e, index)}
    >
      <SymbolItem>
        {symbol.type === 'font' ? (
          <span style={{ fontFamily: alphabet.name, fontSize: `${fontSize}em` }}>
            {symbol.char === ' ' ? '␣' : symbol.char}
          </span>
        ) : (
          symbol.char === ' ' ? (
            <span>␣</span>
          ) : (
            <img src={symbol.imagePath} alt={symbol.char} />
          )
        )}
      </SymbolItem>
    </div>
  );
};

const AlphabetView: React.FC<AlphabetViewProps> = ({ config }) => {
  const { plugin: alphabet } = config;
  const dispatch = useDispatch();
  
  // Créer un ID unique pour ce composant
  const componentId = useMemo(() => 
    `alphabet-${alphabet.id}`, 
    [alphabet.id]
  );
  
  // Récupérer l'état depuis Redux
  const persistedState = useSelector((state: RootState) => 
    state.components[componentId] || {}
  );
  
  const [message, setMessage] = useState(persistedState.message || '');
  const [symbols, setSymbols] = useState<SymbolEntry[]>(persistedState.symbols || []);
  const [cursorPosition, setCursorPosition] = useState(persistedState.cursorPosition || 0);
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  const [listSymbolSize, setListSymbolSize] = useState<number>(2);
  const [inputSymbolSize, setInputSymbolSize] = useState<number>(2);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<{ list: boolean, input: boolean }>({ list: false, input: false });

  // Sauvegarder l'état dans Redux
  const saveState = useCallback((newState: any) => {
    dispatch(setState({
      instanceId: componentId,
      state: newState
    }));
  }, [dispatch, componentId]);

  // Mettre à jour l'état persisté à chaque changement
  useEffect(() => {
    saveState({
      message,
      symbols,
      cursorPosition
    });
  }, [message, symbols, cursorPosition, saveState]);

  // Génère les caractères pour 'all'
  const getCharactersList = useCallback((type: 'letters' | 'numbers', chars: string[] | 'all'): string[] => {
    if (chars === 'all') {
      if (type === 'letters') {
        if (alphabet.alphabetConfig.upperCaseOnly) {
          return Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
        } else if (alphabet.alphabetConfig.hasUpperCase) {
          const lowercase = Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i));
          const uppercase = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
          return [...lowercase, ...uppercase];
        } else {
          return Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i));
        }
      } else if (type === 'numbers') {
        return Array.from({ length: 10 }, (_, i) => i.toString());
      }
    }
    if (type === 'letters' && Array.isArray(chars)) {
      if (alphabet.alphabetConfig.upperCaseOnly) {
        return chars.map(c => c.toUpperCase());
      } else if (alphabet.alphabetConfig.hasUpperCase) {
        return [...chars, ...chars.map(c => c.toUpperCase())];
      }
    }
    return chars || [];
  }, [alphabet.alphabetConfig.upperCaseOnly, alphabet.alphabetConfig.hasUpperCase]);

  const handleCharacterClick = useCallback((char: string) => {
    const finalChar = alphabet.alphabetConfig.upperCaseOnly ? char.toUpperCase() : char;
    
    setMessage(prev => {
      const newMessage = prev.slice(0, cursorPosition) + finalChar + prev.slice(cursorPosition);
      return newMessage;
    });

    const newSymbol: SymbolEntry = {
      char: finalChar,
      type: alphabet.alphabetConfig.type,
      imagePath: alphabet.alphabetConfig.type === 'images' 
        ? `/api/alphabets/${alphabet.id}/resource/${alphabet.alphabetConfig.imageDir}/${char.toLowerCase()}.${alphabet.alphabetConfig.imageFormat}`
        : undefined
    };
    
    setSymbols(prev => {
      const newSymbols = [
        ...prev.slice(0, cursorPosition),
        newSymbol,
        ...prev.slice(cursorPosition)
      ];
      return newSymbols;
    });
    
    setCursorPosition(prev => prev + 1);
  }, [alphabet, cursorPosition]);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Réinitialiser les symboles si l'utilisateur modifie directement le texte
    setSymbols([]);
    setCursorPosition(e.target.selectionStart || 0);
  }, []);

  const handleMessageSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorPosition(e.currentTarget.selectionStart || 0);
  }, []);

  const handleClear = useCallback(() => {
    setMessage('');
    setSymbols([]);
    setCursorPosition(0);
  }, []);

  const handleBackspace = useCallback(() => {
    if (cursorPosition > 0) {
      const newMessage = message.slice(0, cursorPosition - 1) + message.slice(cursorPosition);
      setMessage(newMessage);
      
      // Supprimer le symbole à la position du curseur
      const newSymbols = [
        ...symbols.slice(0, cursorPosition - 1),
        ...symbols.slice(cursorPosition)
      ];
      setSymbols(newSymbols);
      setCursorPosition(cursorPosition - 1);
    }
  }, [message, cursorPosition, symbols]);

  const handleSpace = useCallback(() => {
    handleCharacterClick(' ');
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      symbolIndex: index
    });
  }, []);

  const handleDeleteSymbol = useCallback((index: number) => {
    const newSymbols = [...symbols.slice(0, index), ...symbols.slice(index + 1)];
    setSymbols(newSymbols);
    
    // Mettre à jour le message
    const newMessage = newSymbols.map(s => s.char).join('');
    setMessage(newMessage);
    setCursorPosition(Math.min(cursorPosition, newMessage.length));
    setContextMenu(null);
  }, [symbols, cursorPosition]);

  const handleDuplicateSymbol = useCallback((index: number) => {
    const symbolToDuplicate = symbols[index];
    const newSymbols = [
      ...symbols.slice(0, index + 1),
      symbolToDuplicate,
      ...symbols.slice(index + 1)
    ];
    setSymbols(newSymbols);
    
    // Mettre à jour le message
    const newMessage = newSymbols.map(s => s.char).join('');
    setMessage(newMessage);
    setCursorPosition(Math.min(cursorPosition, newMessage.length));
    setContextMenu(null);
  }, [symbols, cursorPosition]);

  const moveSymbol = useCallback((dragIndex: number, hoverIndex: number) => {
    const newSymbols = [...symbols];
    const [removed] = newSymbols.splice(dragIndex, 1);
    newSymbols.splice(hoverIndex, 0, removed);
    setSymbols(newSymbols);

    const newMessage = newSymbols.map(s => s.char).join('');
    setMessage(newMessage);
    setCursorPosition(Math.min(cursorPosition, newMessage.length));
  }, [symbols, cursorPosition]);

  const updateSymbolSize = useCallback((type: 'list' | 'input', delta: number) => {
    const setter = type === 'list' ? setListSymbolSize : setInputSymbolSize;
    const current = type === 'list' ? listSymbolSize : inputSymbolSize;
    const newSize = Math.max(0.5, Math.min(5, current + delta));
    
    setter(newSize);
    setHasUnsavedChanges(prev => ({ ...prev, [type]: true }));
  }, [listSymbolSize, inputSymbolSize]);

  const saveSymbolSize = useCallback((type: 'list' | 'input') => {
    const size = type === 'list' ? listSymbolSize : inputSymbolSize;
    
    fetch('/api/preferences/general', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        [type === 'list' ? 'alphabet.list_symbol_size' : 'alphabet.input_symbol_size']: Number(size.toFixed(2))
      })
    })
    .then(() => {
      setHasUnsavedChanges(prev => ({ ...prev, [type]: false }));
    })
    .catch(error => {
      console.error('Erreur lors de la mise à jour de la taille:', error);
    });
  }, [listSymbolSize, inputSymbolSize]);

  useEffect(() => {
    // Charger les tailles depuis les préférences
    fetch('/api/preferences/general')
      .then(res => res.json())
      .then(data => {
        setListSymbolSize(data['alphabet.list_symbol_size']);
        setInputSymbolSize(data['alphabet.input_symbol_size']);
      });
  }, []);

  // Fermer le menu contextuel quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const renderCharacter = useCallback((char: string, label?: string) => {
    if (alphabet.alphabetConfig.type === 'font') {
      return (
        <CharacterCard key={char} onClick={() => handleCharacterClick(char)}>
          <CharacterDisplay fontFamily={alphabet.name} fontSize={listSymbolSize}>
            {char}
          </CharacterDisplay>
          <CharacterLabel>{label || char}</CharacterLabel>
        </CharacterCard>
      );
    } else {
      // Pour les images, utilise le caractère en minuscule pour le nom de fichier
      const imageChar = char.toLowerCase();
      const imagePath = `/api/alphabets/${alphabet.id}/resource/${alphabet.alphabetConfig.imageDir}/${imageChar}.${alphabet.alphabetConfig.imageFormat}`;
      return (
        <CharacterCard key={char} onClick={() => handleCharacterClick(char)}>
          <CharacterDisplay fontSize={listSymbolSize}>
            <img src={imagePath} alt={char} style={{ maxWidth: '100%', height: 'auto' }} />
          </CharacterDisplay>
          <CharacterLabel>{label || char}</CharacterLabel>
        </CharacterCard>
      );
    }
  }, [alphabet, handleCharacterClick, listSymbolSize]);

  // Charger la police si nécessaire
  useEffect(() => {
    if (alphabet.alphabetConfig.type === 'font' && alphabet.alphabetConfig.fontFile) {
      const fontFace = new FontFace(
        alphabet.name,
        `url(/api/alphabets/${alphabet.id}/resource/${alphabet.alphabetConfig.fontFile})`
      );
      fontFace.load().then(font => {
        document.fonts.add(font);
      }).catch(error => {
        console.error('Error loading font:', error);
      });
    }
  }, [alphabet]);

  // Obtenir les listes de caractères
  const letters = alphabet.alphabetConfig.characters.letters 
    ? getCharactersList('letters', alphabet.alphabetConfig.characters.letters)
    : [];
  
  const numbers = alphabet.alphabetConfig.characters.numbers
    ? getCharactersList('numbers', alphabet.alphabetConfig.characters.numbers)
    : [];

  return (
    <DndProvider backend={HTML5Backend}>
      <Container>
        <Header>
          <Title>{alphabet.name}</Title>
          <p>{alphabet.description}</p>
        </Header>

        {/* Zone de message */}
        <MessageArea>
          <GridHeader>
            <GridTitle>Symboles entrés</GridTitle>
            <SizeControls>
              <SizeButton onClick={() => updateSymbolSize('input', -0.2)}>-</SizeButton>
              <SizeButton onClick={() => updateSymbolSize('input', 0.2)}>+</SizeButton>
              <SaveButton 
                onClick={() => hasUnsavedChanges.input && saveSymbolSize('input')} 
                title={hasUnsavedChanges.input ? "Sauvegarder la taille" : "Aucun changement à sauvegarder"}
                $hasChanges={hasUnsavedChanges.input}
              >
                <SaveIcon />
              </SaveButton>
            </SizeControls>
          </GridHeader>
          <DroppableContainer>
            {symbols.map((symbol, index) => (
              <DraggableSymbol key={index} symbol={symbol} index={index} moveSymbol={moveSymbol} fontSize={inputSymbolSize} alphabet={alphabet} onContextMenu={handleContextMenu} />
            ))}
            {symbols.length === 0 && (
              <span style={{ color: props => props.theme.colors.textSecondary }}>
                Glissez des symboles ici
              </span>
            )}
          </DroppableContainer>

          {/* Zone de message décodé */}
          <MessageText
            value={message}
            onChange={handleMessageChange}
            onSelect={handleMessageSelect}
            placeholder="Message décodé..."
          />

          <ButtonGroup>
            <Button onClick={handleSpace}>Espace</Button>
            <Button onClick={handleBackspace}>Retour</Button>
            <Button onClick={handleClear}>Effacer tout</Button>
          </ButtonGroup>
        </MessageArea>

        {/* Liste des caractères */}
        <MessageSection>
          <GridHeader>
            <GridTitle>Symboles disponibles</GridTitle>
            <SizeControls>
              <SizeButton onClick={() => updateSymbolSize('list', -0.2)}>-</SizeButton>
              <SizeButton onClick={() => updateSymbolSize('list', 0.2)}>+</SizeButton>
              <SaveButton 
                onClick={() => hasUnsavedChanges.list && saveSymbolSize('list')} 
                title={hasUnsavedChanges.list ? "Sauvegarder la taille" : "Aucun changement à sauvegarder"}
                $hasChanges={hasUnsavedChanges.list}
              >
                <SaveIcon />
              </SaveButton>
            </SizeControls>
          </GridHeader>
          <CharacterGrid>
            {letters.map(char => renderCharacter(char))}
          </CharacterGrid>
        </MessageSection>

        {/* Chiffres */}
        {numbers.length > 0 && (
          <MessageSection>
            <GridHeader>
              <GridTitle>Chiffres</GridTitle>
            </GridHeader>
            <CharacterGrid>
              {numbers.map(char => renderCharacter(char))}
            </CharacterGrid>
          </MessageSection>
        )}

        {/* Caractères spéciaux */}
        {alphabet.alphabetConfig.characters.special && (
          <MessageSection>
            <GridHeader>
              <GridTitle>Caractères spéciaux</GridTitle>
            </GridHeader>
            <CharacterGrid>
              {Object.entries(alphabet.alphabetConfig.characters.special).map(([char, label]) => 
                renderCharacter(char, label)
              )}
            </CharacterGrid>
          </MessageSection>
        )}

        {/* Menu contextuel */}
        {contextMenu && (
          <ContextMenu
            style={{
              left: contextMenu.x,
              top: contextMenu.y
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem onClick={() => handleDuplicateSymbol(contextMenu.symbolIndex)}>
              Dupliquer
            </MenuItem>
            <MenuItem onClick={() => handleDeleteSymbol(contextMenu.symbolIndex)}>
              Supprimer
            </MenuItem>
          </ContextMenu>
        )}
      </Container>
    </DndProvider>
  );
};

export default AlphabetView;
