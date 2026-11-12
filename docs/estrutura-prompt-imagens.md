# Estrutura do prompt de imagens IVAS

Copie o bloco abaixo para **Estrutura do prompt** nas configurações de IA de Eventos. Preencha separadamente **Art direction**. O site e o Instagram estão escritos como texto fixo; o Instagram foi conferido no cadastro do Instituto. As instruções pedem à IA para exibir a data e a hora no formato editorial desejado, a partir dos valores dos marcadores.

```text
Create a sophisticated illustrated poster for an IVAS spiritual ritual. Combine contemporary editorial design, expressive illustration and refined visual storytelling.

ART DIRECTION
{{art_direction}}

EVENT CONTENT
Main title: “{{titulo_ritual}}”
Editorial label: “RITUAL Nº {{numero_ritual}}”
Event date: {{data_ritual}}
Starting time: {{horario_ritual}}
Location: “{{local_ritual}}”

CREATIVE CONCEPT
Interpret the symbolic meaning of the event title through one powerful visual metaphor. Use a coherent central subject, thoughtful secondary details and deliberate negative space. Avoid unrelated mystical symbols, generic fantasy imagery, excessive ornament and decorative clutter.

HIERARCHY AND TYPOGRAPHY
Use the exact event title, preserving all Portuguese accents. Do not invent another title or subtitle. Make the title the main typographic element, with distinctive, sophisticated lettering and excellent mobile readability.

Place the ritual number above the title as a small, refined editorial label. Use balanced spacing and intentional line breaks. Keep essential text on visually calm backgrounds with strong contrast.

DATE AND TIME — PROMINENT EDITORIAL TREATMENT
Combine the actual date and time using this format: “18 de Nov 2026 - 15h”. This example defines formatting only; never copy its values unless they match the supplied event information.

Use abbreviated Portuguese month names: Jan, Fev, Mar, Abr, Mai, Jun, Jul, Ago, Set, Out, Nov, Dez. Display whole hours as “15h” and times with minutes as “15h30”.

Make the date and time the second most prominent text after the title. Give this line generous spacing, excellent contrast and an elegant editorial treatment that makes it immediately visible.

LOCATION AND CONTACT
Place “{{local_ritual}}” below the date and time.
Immediately below the address, display this discreet, clearly readable contact line:
“virtudes.net.br · @ivas.ayahuasca”

Place a small, recognizable Instagram outline icon immediately before “@ivas.ayahuasca”. Match its color to the contact text, align it vertically with the username and preserve a subtle gap. Use the Instagram icon only beside the Instagram username, not beside the website.

OFFICIAL IVAS LOGO
Use {{logo_ivas_fundo_claro}} at the top center, with restrained size and generous clear space. Preserve its lettering, colors, proportions and symbol. Give the logo a calm, light-colored area so its original colors remain visible. Do not reinterpret or blend the logo into the illustration.

COMPOSITION AND FINISH
Maintain clear hierarchy between logo, ritual label, title, date, location and contacts. Balance the illustration with the text without obscuring any letters.

Follow the palette and technique specified in ART DIRECTION. Use luminous accents selectively and quieter areas to create visual depth. Keep the result cohesive, expressive and carefully crafted.

Include only the specified text and requested logos. No invented words, additional slogans, watermarks, mockup frames or artist signatures.
```

Para usar a versão branca da logo, substitua `{{logo_ivas_fundo_claro}}` por `{{logo_ivas_fundo_escuro}}` e ajuste a instrução do fundo da logo para uma área escura.
