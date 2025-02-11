class CaesarCodePlugin:
    """
    Plugin pour encoder/décoder du texte avec le code César.
    Le code César est un chiffrement par substitution où chaque lettre 
    est remplacée par une lettre décalée de N positions dans l'alphabet.
    """

    def __init__(self):
        self.name = "caesar_code"
        self.description = "Plugin d'encodage/décodage avec le code César"
        
        # L'alphabet de référence (majuscules uniquement)
        self.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        self.alphabet_len = len(self.alphabet)
    
    def encode(self, text: str, shift: int) -> str:
        """
        Encode le texte en utilisant un décalage positif.
        Args:
            text (str): Texte à encoder
            shift (int): Décalage à appliquer (nombre de positions)
        Returns:
            str: Texte encodé
        """
        result = []
        for char in text.upper():
            if char in self.alphabet:
                pos = self.alphabet.index(char)
                new_pos = (pos + shift) % self.alphabet_len
                result.append(self.alphabet[new_pos])
            else:
                result.append(char)  # Garder caractères non alphabétiques
        return ''.join(result)
    
    def decode(self, text: str, shift: int) -> str:
        """
        Décode le texte en utilisant un décalage négatif.
        Args:
            text (str): Texte à décoder
            shift (int): Décalage qui a été appliqué
        Returns:
            str: Texte décodé
        """
        return self.encode(text, -shift)

    def bruteforce(self, text: str):
        """
        Teste tous les décalages (1 à 25) pour essayer de retrouver 
        le texte en clair sans connaître le décalage initial.
        
        Args:
            text (str): Texte chiffré dont on veut tester tous les décalages
        Returns:
            list: Liste de solutions, chaque élément étant un dict 
                  { "shift": int, "decoded_text": str }
        """
        solutions = []
        for possible_shift in range(1, 26):
            decoded = self.decode(text, possible_shift)
            solutions.append({
                "shift": possible_shift,
                "decoded_text": decoded
            })
        return solutions
    
    def execute(self, inputs):
        """
        Execute the plugin with the given inputs.
        Returns:
          - encode/decode => {"text_output": "...", "mode": "..."}
          - bruteforce    => {"bruteforce_solutions": [ {shift, decoded_text}, ... ], "mode": "bruteforce"}
        """
        print("INPUT CAESAR", inputs)
        mode = inputs.get('mode', 'encode')
        text_input = inputs.get('text', '')
        shift = int(inputs.get('shift', 13))  # Décalage par défaut: 13

        # Gérer le cas où l'entrée est déjà un résultat de bruteforce
        if isinstance(text_input, dict) and 'bruteforce_solutions' in text_input:
            if mode == 'bruteforce':
                # Pour chaque solution précédente, on applique bruteforce
                all_solutions = []
                for prev_solution in text_input['bruteforce_solutions']:
                    text_to_process = prev_solution['decoded_text']
                    for new_shift in range(1, 26):
                        decoded = self.decode(text_to_process, new_shift)
                        all_solutions.append({
                            'decoded_text': decoded,
                            'shift': new_shift,
                            'previous_shift': prev_solution['shift']
                        })
                return {
                    'bruteforce_solutions': all_solutions,
                    'mode': 'bruteforce'
                }
            else:
                # Pour le mode encode/decode, on traite chaque solution précédente
                solutions = []
                for prev_solution in text_input['bruteforce_solutions']:
                    text_to_process = prev_solution['decoded_text']
                    if mode == 'encode':
                        processed_text = self.encode(text_to_process, shift)
                    else:  # decode
                        processed_text = self.decode(text_to_process, shift)
                    solutions.append({
                        'decoded_text': processed_text,
                        'shift': shift,
                        'previous_shift': prev_solution['shift']
                    })
                return {
                    'bruteforce_solutions': solutions,
                    'mode': "bruteforce"
                }
        
        # Comportement normal pour une entrée texte simple
        if mode == 'bruteforce':
            solutions = []
            for test_shift in range(1, 26):
                decoded = self.decode(text_input, test_shift)
                solutions.append({
                    'decoded_text': decoded,
                    'shift': test_shift
                })
            return {
                'bruteforce_solutions': solutions,
                'mode': 'bruteforce'
            }
        else:
            if mode == 'encode':
                result = self.encode(text_input, shift)
            else:  # decode
                result = self.decode(text_input, shift)
            return {
                'text_output': result,
                'mode': mode
            }
