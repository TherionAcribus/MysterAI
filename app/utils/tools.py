def rot13(text):
    """
    Décode/encode une chaîne en utilisant le chiffrement ROT13.
    
    Le ROT13 est un chiffrement par décalage simple qui remplace chaque lettre
    par la lettre située 13 positions plus loin dans l'alphabet.
    C'est une méthode réversible (encoder = décoder).
    
    Args:
        text (str): Le texte à décoder/encoder
        
    Returns:
        str: Le texte décodé/encodé
    """
    if text is None:
        return None
        
    result = ""
    for char in text:
        # Traitement des lettres majuscules
        if 'A' <= char <= 'Z':
            # Décalage de 13 positions avec retour au début de l'alphabet si nécessaire
            result += chr((ord(char) - ord('A') + 13) % 26 + ord('A'))
        # Traitement des lettres minuscules
        elif 'a' <= char <= 'z':
            # Même principe pour les minuscules
            result += chr((ord(char) - ord('a') + 13) % 26 + ord('a'))
        # Conserver les caractères non alphabétiques tels quels
        else:
            result += char
    
    return result
