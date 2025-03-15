class AffineCodePlugin:
    """
    Plugin pour encoder/décoder du texte avec le chiffre affine.
    Modes : 
      - encode
      - decode
      - bruteforce
    """

    def __init__(self):
        self.name = "affine_code"
        self.description = "Plugin de chiffrement/déchiffrement utilisant le chiffre affine"
        self.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        self.alphabet_len = 26
        # Valeurs de 'a' possibles (premiers avec 26)
        self.possible_a = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]

    def _char_to_num(self, char: str) -> int:
        return self.alphabet.index(char.upper())
    
    def _num_to_char(self, num: int) -> str:
        return self.alphabet[num % self.alphabet_len]

    def _mod_inverse(self, a: int, m: int = 26) -> int:
        """
        Calcule l'inverse modulaire de a modulo m (si gcd(a, m) = 1).
        Trouve a_inv tel que (a * a_inv) mod m = 1.
        """
        # Méthode simple (brute force) : on teste toutes les valeurs
        # de 1 à m-1 pour voir celle qui vérifie la condition.
        a = a % m
        for x in range(1, m):
            if (a * x) % m == 1:
                return x
        raise ValueError(f"Aucun inverse modulaire n'existe pour a={a} mod m={m}")

    def encode(self, text: str, a: int, b: int) -> str:
        """
        Chiffrement affine : E(x) = (a*x + b) mod 26
        """
        result = []
        for char in text.upper():
            if char in self.alphabet:
                x = self._char_to_num(char)
                # Application de l'expression (a*x + b) mod 26
                encoded_num = (a * x + b) % self.alphabet_len
                result.append(self._num_to_char(encoded_num))
            else:
                # On conserve tel quel les caractères hors alphabet
                result.append(char)
        return ''.join(result)

    def decode(self, text: str, a: int, b: int) -> str:
        """
        Déchiffrement affine : D(y) = a^-1 * (y - b) mod 26
        """
        result = []
        # Calcul de l'inverse modulaire de a
        a_inv = self._mod_inverse(a, self.alphabet_len)

        for char in text.upper():
            if char in self.alphabet:
                y = self._char_to_num(char)
                decoded_num = (a_inv * (y - b)) % self.alphabet_len
                result.append(self._num_to_char(decoded_num))
            else:
                result.append(char)
        return ''.join(result)

    def bruteforce(self, text: str):
        """
        Tente toutes les clés (a, b) possibles, 
        où a est premier avec 26 et b dans [0..25].
        Retourne une liste de dicts :
          { "a": int, "b": int, "decoded_text": str }
        """
        solutions = []
        for a_candidate in self.possible_a:
            for b_candidate in range(self.alphabet_len):
                decoded_text = self.decode(text, a_candidate, b_candidate)
                solutions.append({
                    "a": a_candidate,
                    "b": b_candidate,
                    "decoded_text": decoded_text
                })
        return solutions

    def execute(self, inputs):
        """
        Méthode principale appelée par le PluginManager.
        Les champs d'entrée (inputs) devraient contenir :
          - "text" (str)
          - "a" (int) -> facultatif si on est en bruteforce
          - "b" (int) -> facultatif si on est en bruteforce
          - "mode" ("encode", "decode", "bruteforce")

        Les retours sont sous forme de dict JSON.
        """
        text = inputs.get('text', '')
        mode = inputs.get('mode', 'encode')
        # a et b (typiquement 1, 0 par défaut)
        a = int(inputs.get('a', 1))
        b = int(inputs.get('b', 0))

        # BRUTEFORCE
        if mode == 'bruteforce':
            solutions = self.bruteforce(text)
            return {
                'bruteforce_solutions': solutions,
                'mode': 'bruteforce'
            }

        # ENCODE
        elif mode == 'encode':
            encoded = self.encode(text, a, b)
            print(encoded)
            return {
                'text_output': encoded,
                'mode': 'encode',
                'a': a,
                'b': b
            }

        # DECODE
        else:  # mode == 'decode'
            try:
                decoded = self.decode(text, a, b)
                return {
                    'text_output': decoded,
                    'mode': 'decode',
                    'a': a,
                    'b': b
                }
            except ValueError as e:
                # Si a n'est pas premier avec 26, la mod inverse échoue
                return {
                    'error': str(e),
                    'mode': 'decode',
                    'a': a,
                    'b': b
                }
