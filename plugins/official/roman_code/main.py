class RomanNumeralsPlugin:
    """
    Plugin pour convertir entre décimal et chiffres romains.
    - mode="encode" => value est un entier (sous forme de string),
        on renvoie {"roman": "..."}
    - mode="decode" => value est une chaîne de chiffres romains,
        on renvoie {"decimal": <int>}
    """

    def __init__(self):
        self.name = "roman_numerals"
        self.description = "Convertit un entier décimal en chiffres romains et inversement."
    
    def encode_roman(self, number: int) -> str:
        """
        Convertit un nombre décimal (ex: 42) en chiffres romains (ex: 'XLII').
        Règles standard (pas de notation au-delà de 3999 dans la forme classique, 
        mais on peut étendre si on le souhaite).
        """
        if number <= 0:
            # Normalement, on ne définit pas de romains pour 0 ou négatifs
            raise ValueError("Les chiffres romains ne sont pas définis pour 0 ou négatifs.")

        # Couples (valeur, symbole)
        roman_map = [
            (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
            (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),
            (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")
        ]

        result = []
        for val, symb in roman_map:
            while number >= val:
                result.append(symb)
                number -= val
        return "".join(result)

    def decode_roman(self, roman_str: str) -> int:
        """
        Convertit une chaîne de chiffres romains (ex: 'XLII') en entier (ex: 42).
        """
        # Dictionnaire de base
        roman_values = {
            'M': 1000, 'D': 500, 'C': 100,
            'L': 50,   'X': 10,   'V': 5,
            'I': 1
        }

        # Mise en majuscules
        roman_str = roman_str.upper()

        total = 0
        prev_value = 0

        for char in reversed(roman_str):
            # On lit de droite à gauche
            if char not in roman_values:
                raise ValueError(f"Symbole romain inconnu: {char}")
            value = roman_values[char]
            # Si la valeur est au moins égale à la valeur précédente, on additionne
            # Sinon, on la soustrait (ex: IV = 4 => 'I' précède 'V')
            if value >= prev_value:
                total += value
            else:
                total -= value
            prev_value = value
        
        return total

    def execute(self, inputs: dict) -> dict:
        """
        Méthode générique d'exécution, appelée par le PluginManager.
        - inputs["mode"] = "encode" ou "decode"
        - inputs["value"] = string représentant le nombre (ex: "42") ou 
          les chiffres romains (ex: "XLII").
        """
        mode = inputs.get("mode", "encode")  # par défaut, "encode"
        value_str = inputs.get("text", "")

        if mode == "encode":
            # On convertit value_str en entier
            try:
                number = int(value_str)
            except ValueError:
                raise ValueError(f"Impossible de convertir '{value_str}' en entier.")
            
            roman = self.encode_roman(number)
            return {"text_output": roman, "mode": mode}

        elif mode == "decode":
            # On interprète value_str comme un chiffre romain
            decimal = self.decode_roman(value_str)
            return {"text_output": decimal, "mode": mode}
        
        else:
            raise ValueError(f"Mode inconnu: {mode}")
