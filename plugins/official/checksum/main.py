class ChecksumCodePlugin:
    """
    Plugin pour calculer la somme des valeurs des lettres (A=1, B=2, etc.)
    avec un décalage paramétrable (e.g. shift=2 => A=2, B=3, etc.).
    """

    def __init__(self):
        self.name = "checksum_code"
        self.description = "Plugin pour calculer la somme des valeurs des lettres (A=1, B=2, etc.) avec un décalage."

    def calculate_checksum(self, text: str, shift: int = 1) -> int:
        """
        Calcule la somme des valeurs des lettres dans 'text',
        en utilisant le décalage donné. 
        Par défaut, shift=1 => A=1, B=2, ..., Z=26.
        
        Exemple: 
          - shift=2 => A=2, B=3, ..., Z=27
          - shift=3 => A=3, B=4, ..., Z=28, etc.
        
        Ignore les caractères non-alphabétiques.
        """
        total = 0
        text = text.upper()
        for char in text:
            if 'A' <= char <= 'Z':
                # Valeur de A = 1 => ord(char) - ord('A') + 1
                # Avec décalage => ord(char) - ord('A') + shift
                value = (ord(char) - ord('A')) + shift
                total += value
        return total

    def execute(self, inputs: dict) -> dict:
        """
        Point d'entrée générique appelé par le PluginManager.
        
        inputs attendus:
          - text (str)
          - shift (int, optionnel, défaut=1)
        
        Retourne un dict: { "checksum": <somme> }
        """
        text = inputs.get("text", "")
        shift = int(inputs.get("shift", 1))

        print(inputs)

        # On calcule le checksum
        cs = self.calculate_checksum(text, shift)

        # On retourne le résultat sous forme d'un dict
        return {"text_output": cs, "mode": "calcul"}
