import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Temporary, one-shot content-seeding route — same pattern as every
// other seed-* route (hardcoded, generated from the verified local
// dev DB, idempotent, no user input, deleted right after it's
// triggered once). Seeds all three Elbow Anatomy translations
// (es, pt-pt, pt-br) in one pass. Content was translated from
// production's CURRENT Elbow Anatomy (pulled after the admin's own
// live edits, not the original seed), using the app's own
// translatable-fields.ts field spec to isolate exactly the strings
// that should move and leave structural/decorative fields untouched.
// Image blocks reference the SAME already-uploaded production image
// URLs the English page uses — no new image upload needed here.

const pages: { slug: string; canonicalName: string; blocks: { block_type: string; content_config: unknown }[] }[] = [
  {
    "slug": "elbow-anatomy-es",
    "canonicalName": "Anatomía del Codo",
    "blocks": [
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<strong>Un capítulo docente para médicos residentes y especialistas en Medicina Física y Rehabilitación</strong> — Edición para residentes.<br><br>Solo anatomía. La biomecánica se trata por separado."
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "1. Introducción general"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageUrl": "/api/uploads/illustrations/aad94af2-0b38-4067-ba22-e9ae8ec3c6ae.png"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "El hombro orienta el brazo. <strong>El codo posiciona la mano en el espacio y controla la distancia entre la mano y el cuerpo.</strong> Toda consecuencia funcional de la patología del codo se deriva de esto: un codo rígido es incapacitante de una manera que una muñeca rígida no lo es, porque el paciente ya no puede llevar la mano a la cara, el periné o el suelo."
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "1.1 Tres articulaciones dentro de una sola cápsula"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "Este es el hecho estructural más importante sobre el codo, y la razón por la que sus problemas se comportan como lo hacen. Tres articulaciones comparten <strong>una única cavidad sinovial y una única cápsula</strong>, de modo que un proceso en cualquiera de ellas —sangre, pus, sinovitis, adherencias— afecta a las tres."
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Humerocubital</strong>",
              "Troclear (gínglimo)",
              "Tróclea ↔ escotadura troclear del cúbito",
              "Flexión/extensión; <strong>el principal estabilizador óseo</strong>"
            ],
            [
              "<strong>Humerorradial</strong>",
              "Esferoidea modificada",
              "Cóndilo humeral (capitellum) ↔ cabeza radial",
              "Flexión/extensión + rotación; transmite ~60% de la carga axial"
            ],
            [
              "<strong>Radiocubital proximal</strong>",
              "Trocoide (pivote)",
              "Cabeza radial ↔ escotadura radial del cúbito, dentro del ligamento anular",
              "Pronación/supinación"
            ]
          ],
          "columns": [
            "<strong>Articulación</strong>",
            "<strong>Tipo</strong>",
            "<strong>Entre</strong>",
            "<strong>Función</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Una cápsula = tres consecuencias que verá cada semana.</strong><br><br>1. Un <strong>hemartros o derrame</strong> distiende toda la articulación, por lo que el paciente pierde la flexión, la extensión y la rotación a la vez.<br><br>2. <strong>La contractura capsular postraumática afecta a las tres</strong> —por eso la rigidez postraumática del codo es tan global y tan difícil de tratar.<br><br>3. Una <strong>única infiltración intraarticular</strong> alcanza las tres articulaciones. No es necesario dirigirse a cada una por separado.",
          "color": "accent",
          "label": "Perla clínica en MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "1.2 Rango de movimiento: total y funcional"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "67bc11b4-e1f0-4e23-aadb-b97aeb3c6d28",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/973ac19d-f914-4a7d-b890-9fb8e3632d97.png",
              "imageFit": "contain"
            },
            {
              "id": "f8276dd4-eb59-4ed2-9cf2-f3b67339d8c7",
              "label": ""
            }
          ]
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Flexión-extensión</strong>",
              "0–140° (hasta 10° de hiperextensión en laxitud)",
              "<strong>30–130°</strong>"
            ],
            [
              "<strong>Pronación</strong>",
              "80-90º",
              "<strong>50°</strong>"
            ],
            [
              "<strong>Supinación</strong>",
              "80–90°",
              "<strong>50°</strong>"
            ]
          ],
          "columns": [
            "<strong>Movimiento</strong>",
            "<strong>Rango completo</strong>",
            "<strong>Arco funcional (Morrey)</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Utilice el arco funcional, no el rango completo, para fijar los objetivos de rehabilitación.</strong> Un paciente que alcanza 30–130° de flexión con 50° de pronación y supinación puede realizar casi todas las actividades de la vida diaria. Perseguir los últimos 20° de extensión en un codo rígido postraumático a menudo cuesta más en dolor, inflamación y riesgo de osificación heterotópica de lo que aporta en función.<br><br>La excepción es la <strong>pérdida de extensión en alguien que necesita alcance</strong> (usuarios de muletas o silla de ruedas, trabajadores manuales) y la <strong>pérdida de flexión en cualquier paciente</strong>, porque la flexión es lo que lleva la mano a la cara.",
          "color": "accent",
          "label": "Perla clínica en MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "1.3 El ángulo de carga (ángulo cubital)"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Con el codo en <strong>extensión y supinación completas</strong>, el antebrazo se desvía lateralmente respecto al eje del brazo: esta inclinación en valgo es el <strong>ángulo de carga</strong>.</li><li>Normal: aproximadamente <strong>11–14° en varones y 13–16° en mujeres</strong> (se citan rangos de 5–20°). Existe para que el antebrazo, al oscilar, libre la pelvis.</li><li><strong>Disminuye progresivamente con la flexión</strong> y desaparece (o se invierte a un ligero varo) en flexión completa. Mídalo siempre en extensión completa con la palma hacia delante, o la cifra carece de sentido.</li><li>El <strong>cúbito valgo</strong> (ángulo aumentado) suele deberse a una consolidación viciosa o a un cierre fisario del cóndilo lateral, y es la causa clásica de la <strong>parálisis tardía del nervio cubital</strong>, que aparece años después de la lesión infantil.</li><li>El <strong>cúbito varo</strong> (\"deformidad en culata de fusil\") sigue a una fractura supracondílea consolidada en mala posición. Es sobre todo estético, pero se asocia con inestabilidad rotatoria posterolateral tardía.</li></ul>"
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "2. Osteología"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "0a0b3bff-d1f9-475f-8ec5-ef75641fbb06",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/f0287290-86ed-4f00-a0ba-d0b6d0b6fcf8.png",
              "imageFit": "contain"
            },
            {
              "id": "56d09677-e78c-406a-9586-28f37dcb59a6",
              "label": ""
            }
          ]
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "2.1 Húmero distal"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "2.1.1 El concepto de las dos columnas"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>El húmero distal se representa mejor como un <strong>triángulo</strong>:&nbsp;</li><ul><li><span class=\"font-bold\">c</span><strong>olumna medial</strong></li><li><strong>columna lateral</strong>&nbsp;</li><li><strong>superficie articular (tróclea + cóndilo humeral)</strong> suspendida entre ambas como el travesaño.</li></ul></ul><br><ul><li>Esto explica los patrones de fractura y la estrategia de fijación, y explica por qué el húmero distal es relativamente delgado entre las fosas: hay hueso en los bordes, no en el centro.</li></ul>"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/feb57bb7-993c-4770-beb3-d315869bbe2a.png",
          "imageWidth": "3/4"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "2.1.2 Superficies articulares"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Tróclea</strong> — la superficie medial, en forma de carrete, que se articula con el cúbito. Tiene un surco profundo y cubre un arco de unos 300°, lo que confiere a la articulación humerocubital su estabilidad intrínseca.</li><li><strong>Cóndilo humeral (capitellum)</strong> — la superficie lateral, casi esférica, que se articula con la cabeza radial. Cubre solo la mitad <strong>anterior</strong> del cóndilo lateral, razón por la cual la cabeza radial solo se articula con él en flexión, y por la que las lesiones del cóndilo humeral (osteocondritis disecante) se presentan con síntomas relacionados con la flexión.</li><li><strong>Orientación:</strong>&nbsp;</li><ul><li>el bloque articular está rotado aproximadamente <strong>30° en anteversión</strong> respecto a la diáfisis humeral</li><li>inclinado unos <strong>6° en valgo</strong></li><li><span class=\"font-bold\">rotado internamente unos <strong>5</strong></span><strong>°</strong></li><li>La pérdida de esa angulación anterior tras una fractura supracondílea consolidada en mala posición bloquea la flexión mecánicamente — ningún tratamiento de rehabilitación la restaurará.</li></ul></ul>"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "2.1.3 Fosas"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Fosa coronoidea</strong> (anteromedial) — recibe la apófisis coronoides en flexión completa.</li><li><strong>Fosa radial</strong> (anterolateral) — recibe la cabeza radial en flexión completa.</li><li><strong>Fosa olecraniana</strong> (posterior) — recibe el olécranon en extensión completa, y es donde se oculta la <strong>almohadilla grasa posterior</strong>.</li></ul>"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "2.1.4 Epicóndilos"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Epicóndilo medial</strong> — más grande, no articular, proyectado posteromedialmente. Origen de la <strong>masa común de los flexores-pronadores</strong> y del <strong>ligamento colateral cubital</strong>. El <strong>nervio cubital discurre por un surco justo por detrás de él</strong>.</li><li><strong>Epicóndilo lateral</strong> — más pequeño. Origen de la <strong>masa común de los extensores</strong> y del <strong>complejo ligamentoso colateral lateral</strong>.</li><li><strong>Crestas supracondíleas</strong> — la cresta lateral da origen al <strong>braquiorradial y al extensor radial largo del carpo</strong>, razón por la cual estos dos músculos no forman parte del origen extensor común y quedan indemnes en la epicondilalgia lateral.</li></ul>"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/f1260b78-a910-4bc1-b5a7-ab5a87950271.png",
          "imageWidth": "3/4"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/8fb37ad4-3920-4d8d-864f-631805a0da82.png",
          "imageWidth": "3/4"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/ef715896-8e8b-4a8d-a7ed-962fd72786d1.png",
          "imageWidth": "1/2"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "2.2 Cúbito proximal"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<span></span>El cúbito proximal forma una silla de montar profunda y muy congruente con la tróclea humeral, actuando como estabilizador estático primario de la articulación.<span>\n</span><b><br></b><ul><li><strong>Escotadura troclear (sigmoidea mayor)</strong> — un gancho de ~190° que abraza la tróclea. Esta es la fuente de la estabilidad ósea del codo.</li><li><strong>Área desnuda transversal</strong> — una franja naturalmente desprovista de cartílago que atraviesa el centro de la escotadura troclear, separando las carillas articulares del olécranon y de la coronoides. <strong>Es normal. No debe informarse como un defecto condral.</strong></li><li><strong>Olécranon</strong> — la proyección posterior subcutánea; inserción del <strong>tríceps</strong>. Su vértice entra en la fosa olecraniana en extensión.</li><li><strong>Apófisis coronoides</strong> — el contrafuerte anterior. Es el bloqueo clave frente a la subluxación posterior; la deficiencia de la coronoides desestabiliza el codo de forma desproporcionada respecto al tamaño del fragmento.</li><li><strong>Tubérculo sublime</strong> — en la coronoides medial: <strong>la inserción del fascículo anterior del LCC (ligamento colateral cubital)</strong>. Recuerde este nombre; aparece en todos los informes sobre el codo del lanzador.</li><li><strong>Escotadura radial (sigmoidea menor)</strong> — lateral, se articula con la cabeza radial.</li><li><strong>Cresta del supinador</strong> — discurre distalmente desde la escotadura radial: <strong>la inserción del ligamento colateral cubital lateral</strong>.</li></ul>"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/f602a3dd-bdcb-46a5-8139-87a13a8694ed.png"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "2.3 Radio proximal"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "8794b9fe-3703-4bab-a881-bda9cc51a491",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/3366de96-fb08-4cdf-90d9-9cefeb52d87b.png",
              "imageFit": "contain"
            },
            {
              "id": "8bafed7a-1102-4bda-bec1-cdd6b34cdc0d",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/476433a0-7441-4bd4-89c5-51d5c46c84c3.png",
              "imageFit": "contain"
            },
            {
              "id": "fe15e347-25bf-4bc9-8b0a-3a2e5ed67b1d",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/d219e8d1-2019-49ef-9432-f4d44d434a05.png"
            }
          ]
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<span></span>La cabeza radial actúa como un importante estabilizador estático secundario de la articulación del codo.<span></span><b><br></b><ul><li><strong>Cabeza radial</strong> — de forma discoidea, con una cúpula cóncava para el cóndilo humeral. Es <strong>elíptica, no circular</strong>, razón por la cual debe alinearse correctamente si se sustituye o se fija.</li><ul><li class=\"\" data-start-index=\"3142\"><span><span class=\"underline\">Cobertura articular</span>: <span class=\"font-bold\">El cartílago hialino cubre</span> la cúpula articular proximal cóncava (que contacta con el cóndilo humeral) y se extiende a lo largo de un arco de aproximadamente<span class=\"font-bold\"> 240° a lo largo del borde externo </span>(que contacta con la escotadura sigmoidea menor del cúbito).</span></li><li class=\"\" data-start-index=\"3142\"><span><span class=\"underline\">Zona segura quirúrgica</span>: El <span class=\"font-bold\">arco restante de 120° del borde no está </span><span class=\"font-bold\">cubierto por cartílago</span> y es el que utilizan los cirujanos para colocar el material de osteosíntesis durante la reducción y fijación interna de las fracturas desplazadas de la cabeza radial.</span></li></ul><li><strong>Cuello radial</strong> — la constricción por debajo de la cabeza, angulada ligeramente en sentido lateral.</li><li><strong>Tuberosidad radial (bicipital)</strong> — en el cuello anteromedial: <strong>inserción del tendón distal del bíceps</strong>.</li></ul><br>Funcionalmente, la cabeza radial es el <strong>estabilizador secundario más importante frente al valgo</strong>. Puede extirparse en un codo con LCC íntegro, pero su extirpación en un codo con déficit del LCC produce una inestabilidad franca."
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "2.4 Desarrollo pediátrico y la regla mnemotécnica CRITOE — Núcleos de osificación"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<span></span>En fisiatría pediátrica, el codo es una de las regiones más difíciles de interpretar diagnósticamente debido a la <span class=\"font-bold\">aparición no simultánea de seis núcleos de osificación secundarios</span>. <br><br>Interpretar erróneamente estas estructuras en desarrollo como \"fragmentos\" es una fuente frecuente de <span class=\"font-bold\">error iatrogénico</span>. <br>Dominar el orden cronológico de aparición de estos núcleos no es opcional para el clínico.<br><br><span></span>"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>C</strong>",
              "<span class=\"font-bold\">C</span>apitellum (cóndilo humeral)",
              "1"
            ],
            [
              "<strong>R</strong>",
              "<span class=\"font-bold\">R</span>adial head (cabeza radial)",
              "3"
            ],
            [
              "<strong>I</strong>",
              "<span class=\"font-bold\">I</span>nternal (epicóndilo medial)",
              "5"
            ],
            [
              "<strong>T</strong>",
              "<span class=\"font-bold\">T</span>rochlea (tróclea)",
              "7"
            ],
            [
              "<strong>O</strong>",
              "<span class=\"font-bold\">O</span>lecranon (olécranon)",
              "9"
            ],
            [
              "<strong>E</strong>",
              "<span class=\"font-bold\">E</span>xternal (epicóndilo lateral)",
              "11"
            ]
          ],
          "columns": [
            "<strong>Orden</strong>",
            "<strong>Núcleo</strong>",
            "<strong>Edad aproximada (años)</strong>"
          ]
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Las edades son aproximadas y se adelantan <strong>1–2 años en las niñas</strong>. El <strong>orden</strong> es fiable; las edades exactas no lo son.</li></ul>"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/0770a7ed-e245-4dc8-a406-a7c14251e12a.png",
          "imageWidth": "2/3"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<i data-start-index=\"2295\" class=\"\"></i>Recuerde que la osificación en las <span class=\"font-bold\">niñas</span> suele producirse aproximadamente <span class=\"font-bold\">dos años antes</span> que estos marcadores estándar.<br><br>Para prevenir errores diagnósticos, utilizamos <span class=\"underline\"></span><span class=\"font-bold\">3 pilares diagnósticos</span><span class=\"underline\"></span>:<br><ul><li><span class=\"underline\">Regla del orden</span>: Los <span class=\"font-bold\">núcleos deben aparecer en la secuencia CRITOE</span>. Si la tróclea es visible pero el epicóndilo medial está ausente, debe sospecharse una avulsión o una luxación.</li><li><span class=\"underline\">Regla de la edad</span>: Si una estructura con aspecto de núcleo de osificación <span class=\"font-bold\">aparece años antes de su ventana cronológica</span> (p. ej., un \"olécranon\" a los 5 años), es <span class=\"font-bold\">patognomónico de un fragmento de fractura</span>.</li><li><span class=\"underline\">Morfología</span>: Los verdaderos núcleos de osificación son <span class=\"font-bold\">lisos, redondeados y típicamente simétricos</span> respecto a la extremidad contralateral. Las fracturas se caracterizan por bordes irregulares, afilados y no congruentes.</li></ul><br><span></span>La aplicación más útil de la regla CRITOE →&nbsp;<span class=\"font-bold\">El <span>epicóndilo medial siempre se osifica antes que la tróclea</span>.</span><ul><li>Así pues, si observa un núcleo de osificación en la región de la tróclea pero <span>no hay epicóndilo medial</span>, el fragmento \"troclear\" es en realidad un <span>epicóndilo medial avulsionado</span> —a menudo atrapado dentro de la articulación tras una luxación que se ha reducido espontáneamente.</li><li>Esto obliga al axioma pediátrico fundamental: <span class=\"font-bold\"><span class=\"italic\">\"Epicóndilo medial ausente = mirar dentro de la articulación.\"</span></span></li></ul><span data-start-index=\"3293\" class=\"\"></span>",
          "label": "Idea clave"
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "3. La cápsula articular, las almohadillas grasas y las bolsas serosas"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "3.1 Cápsula"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "aa9e8e34-d1c1-4d1c-8ed3-0f7fe895bd31",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/5ed674b8-68e4-4f85-a38c-8defb885cee4.png",
              "imageFit": "contain"
            },
            {
              "id": "7b91e183-9f19-4716-a988-eabf1d6c0617",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/3dca7b04-5d0f-4773-a9dd-13ba57f700c1.png",
              "imageFit": "contain"
            },
            {
              "id": "589f2777-f1ef-4ecc-8be4-0708a5b72607",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/f3f0ad7f-b511-4bc1-b088-b9416d94ff61.png"
            }
          ]
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Una única cápsula envuelve las tres articulaciones. Se inserta proximalmente por encima de las fosas coronoidea y radial en su cara anterior y por encima de la fosa olecraniana en su cara posterior, y distalmente en la coronoides, el ligamento anular y el olécranon.</li><li>Es <strong>fina y débil en su cara anterior y posterior</strong> (donde permite el movimiento) y <strong>se engrosa medial y lateralmente</strong> formando los ligamentos colaterales (donde aporta estabilidad).</li><li>La capacidad normal es de aproximadamente <strong>25–30 mL</strong>.</li><li><strong>La capacidad es máxima hacia los 70–80° de flexión.</strong></li></ul>"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>¿Por qué el paciente mantiene el codo a 70–80°?</strong>&nbsp;<br>Porque ahí el volumen capsular es máximo, es la posición de menor presión intraarticular y de menor dolor cuando la articulación está distendida. Un paciente sentado con el codo mantenido en torno a los 80° y que se niega a moverlo tiene un <strong>derrame hasta que se demuestre lo contrario</strong> —sangre, pus o sinovitis.<br><br>Este mismo hecho tiene dos aplicaciones prácticas: <br><ul><li>es la <strong>posición de confort para inmovilizar un codo agudamente inflamado</strong>,&nbsp;</li><li>es la <strong>posición de mayor rendimiento para la artrocentesis</strong>.</li></ul><br>También es una advertencia. Inmovilizar un codo en esa posición cómoda de flexión intermedia es exactamente cómo se genera una <strong>contractura en flexión</strong>. Inmovilice de forma aguda para el confort, y después movilice de forma precoz.",
          "color": "accent",
          "label": "Perla clínica en MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "3.2 Almohadillas grasas"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "205ba01f-d015-4926-901a-81973e7ca74b",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/912ac264-fb37-4dc2-bd7b-50b26f4da542.png",
              "imageFit": "contain"
            },
            {
              "id": "f5101b6f-848e-4808-9ac6-a5402f491bd5",
              "label": ""
            }
          ]
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "Existen 3 almohadillas grasas <strong>dentro de la cápsula pero fuera de la sinovial</strong> (intracapsulares, extrasinoviales): anterior (coronoidea + radial) y posterior (olecraniana).<br><ul><li>La <strong>almohadilla grasa anterior</strong> es normalmente visible en la radiografía lateral como una fina radiolucencia que se adosa al húmero.</li><li>La <strong>almohadilla grasa posterior es normalmente invisible</strong>, porque se sitúa en la profundidad de la fosa olecraniana.</li></ul>"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Una almohadilla grasa posterior visible en una radiografía lateral verdadera con 90° de flexión indica un derrame intraarticular —y, en el contexto traumático, una fractura oculta hasta que se demuestre lo contrario.</strong> En adultos, pensar en la cabeza radial; en niños, pensar en fractura supracondílea.<br><br>Una almohadilla grasa anterior desplazada y elevada es el <strong>\"signo de la vela\"</strong>, con el mismo significado.<br><br>Una radiografía de aspecto normal con un signo de la almohadilla grasa positivo <strong>no es un codo normal</strong>. Trátelo como una fractura, inmovilice y repita la imagen.",
          "color": "red",
          "label": "Trampa diagnóstica — no pasar por alto"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "3.3 Bolsas serosas"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "bb73a723-5db3-4c56-991f-da266426edce",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/5a6704d4-f3a6-4539-a088-7225a0841f84.png"
            },
            {
              "id": "4e274d8b-5380-4ea1-9042-d6896d417eb5",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/eecfbbba-2478-45ef-a931-f6437ee3e131.png"
            },
            {
              "id": "70f63dfc-02df-4544-a88e-139b06ebe4db",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/5ec1a4c9-17e7-4656-bf36-1a4a7e248e77.png"
            }
          ]
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Olecraniana (subcutánea)</strong>",
              "Entre la piel y el olécranon, superficial a la inserción del tríceps",
              "La bursitis más frecuente del organismo. Traumática, inflamatoria (gota, AR) o <strong>séptica</strong> —y su posición superficial hace que la infección sea frecuente. <strong>Extraarticular</strong>, de modo que una bolsa tumefacta con movilidad libre del codo es una bursitis, no una artritis"
            ],
            [
              "<strong>Bicipitorradial</strong>",
              "Entre el tendón distal del bíceps y la tuberosidad radial",
              "Se inflama con la supinación repetitiva; causa de dolor anterior del codo y ocasionalmente de irritación del nervio interóseo posterior (NIP)"
            ],
            [
              "<strong>Interósea (cubital)</strong>",
              "Entre el tendón del bíceps y el cúbito",
              "Poco frecuente"
            ]
          ],
          "columns": [
            "<strong>Bolsa serosa</strong>",
            "<strong>Localización</strong>",
            "<strong>Relevancia clínica</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Cómo distinguir la bursitis olecraniana de la artritis del codo en la cabecera del paciente:</strong> <br><ul><li>La bursitis produce una tumefacción posterior bien delimitada y fluctuante, con un <strong>rango de movilidad pasiva casi completo</strong>.&nbsp;</li><li>La artritis o un derrame producen un codo con tumefacción difusa, mantenido a 70–80°, con <strong>movilidad dolorosa y restringida en todos los planos</strong>.</li></ul><br><strong>Realice la artrocentesis por el lado lateral, nunca directamente a través del vértice posterior</strong> —la piel posterior es fina, está mal vascularizada y soporta carga al apoyarse, por lo que una punción posterior fácilmente se convierte en un trayecto fistuloso crónico.",
          "color": "accent",
          "label": "Perla clínica en MFR"
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "4. Ligamentos y estabilidad"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "4.1 Complejo ligamentoso colateral medial (cubital)"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "Un complejo triangular de tres fascículos, de los cuales <strong>solo uno tiene verdadera relevancia clínica</strong>."
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Fascículo anterior</strong>",
              "Cara anteroinferior del epicóndilo medial → <strong>tubérculo sublime</strong> de la coronoides",
              "A lo largo de todo el rango de <strong>20–120°</strong>; sus bandas anterior y posterior se tensan de forma recíproca, de modo que siempre hay alguna parte tensa",
              "<strong>EL principal freno al valgo.</strong> La estructura que se lesiona en los lanzadores y que se reconstruye en la cirugía de \"Tommy John\""
            ],
            [
              "<strong>Fascículo posterior</strong><strong> (de Bardinet)</strong>",
              "Epicóndilo medial → borde medial del olécranon; forma de abanico",
              "Más allá de <strong>90°</strong> de flexión",
              "Secundario. <strong>Su contractura es una causa importante de contractura postraumática en flexión</strong>"
            ],
            [
              "<strong>Ligamento transverso (de Cooper)</strong>",
              "Olécranon → coronoides, es decir, de cúbito a cúbito",
              "—",
              "No cruza ninguna articulación. No contribuye prácticamente nada a la estabilidad"
            ]
          ],
          "columns": [
            "<strong>Componente</strong>",
            "<strong>Trayecto</strong>",
            "<strong>Tenso cuando</strong>",
            "<strong>Importancia</strong>"
          ]
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/38fefb17-8cf2-47e1-8529-a56f90dc8e6c.png"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "Dado que el fascículo anterior se origina <strong>posterior al eje de rotación</strong>, se tensa a medida que el codo se flexiona. Esa es la base anatómica de la <strong>prueba de estrés en valgo dinámica (moving valgus stress test)</strong>: el dolor se reproduce aproximadamente entre 70° y 120° mientras se moviliza el codo bajo una carga en valgo constante.<br><br>La <strong>apófisis del epicóndilo medial es más débil que el ligamento en el deportista esqueléticamente inmaduro</strong>. Así, la misma sobrecarga en valgo que rompe el LCC en un adulto produce una <strong>apofisitis del epicóndilo medial (\"codo de Little League\")</strong> en un niño. Mismo mecanismo, distinto punto de fallo —y un manejo completamente diferente.",
          "color": "accent",
          "label": "Perla clínica en MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "4.2 Complejo ligamentoso colateral lateral"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Ligamento colateral cubital lateral (LCCL)</strong>",
              "Epicóndilo lateral → <strong>cresta del supinador</strong> del cúbito, pasando superficial al ligamento anular",
              "<strong>Principal freno a la inestabilidad rotatoria posterolateral (IRPL).</strong> La estructura lateral crítica"
            ],
            [
              "<strong>Ligamento colateral radial</strong>",
              "Epicóndilo lateral → se fusiona con el ligamento anular",
              "Prácticamente <strong>isométrico</strong> a lo largo de todo el arco; resiste el varo"
            ],
            [
              "<strong>Ligamento anular</strong>",
              "Rodea la cabeza radial, insertándose en los bordes anterior y posterior de la escotadura radial del cúbito",
              "Mantiene la cabeza radial contra el cúbito. <strong>Tiene forma de embudo, más estrecho distalmente</strong> —razón por la cual la cabeza queda retenida en su interior"
            ],
            [
              "<strong>LCL accesorio</strong>",
              "Ligamento anular → cresta del supinador",
              "Estabiliza el ligamento anular durante el estrés en varo"
            ]
          ],
          "columns": [
            "<strong>Componente</strong>",
            "<strong>Trayecto</strong>",
            "<strong>Función</strong>"
          ]
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/0c8df9ba-f440-47d6-9cb5-40bacee5e6c3.png"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>¿Por qué le importa el LCCL a un especialista en MFR?</strong>&nbsp;<br>Es la estructura cuyo fallo produce <strong>inestabilidad rotatoria posterolateral</strong> —un paciente que describe chasquidos, resaltes o aprensión al incorporarse de una silla apoyándose con el antebrazo en supinación.<br><br><span class=\"underline\">Dos causas</span> que debe conocer: <br><ol><li>tras una <strong>luxación de codo</strong></li><li><strong>iatrogénica</strong> —por cirugía excesivamente agresiva o infiltraciones profundas repetidas de corticoides para la epicondilalgia lateral. Explórela con la <strong>prueba de incorporación desde la silla (chair push-up test)</strong>, la <strong>prueba de reducción sobre la mesa (tabletop relocation test)</strong>, o el pivot-shift lateral.</li></ol><br>Esta es una razón clínica directa para mantener las infiltraciones de corticoides en el codo de tenista superficiales, poco frecuentes y, preferiblemente, para priorizar otras opciones.",
          "color": "accent",
          "label": "Perla clínica en MFR"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "4.2.1 El ligamento anular y la pronación dolorosa (codo de niñera)"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>En un niño menor de unos 5 años la cabeza radial aún no está completamente formada y el ligamento anular es relativamente laxo.</li><li>Una <strong>tracción axial brusca sobre el antebrazo en pronación y extensión</strong> permite que el ligamento anular se deslice proximalmente sobre la cabeza radial y quede atrapado en la articulación radiocapitelar —<strong>\"codo tironeado\" o pronación dolorosa</strong>.</li><li>El niño mantiene el brazo <strong>en pronación y ligera flexión</strong>, se niega a usarlo, y <strong>no presenta tumefacción ni dolor localizado a la palpación</strong>. Las radiografías son normales.</li><li>La reducción se realiza mediante <strong>supinación con flexión</strong>, o mediante <strong>hiperpronación</strong> (que presenta una tasa de éxito ligeramente mayor al primer intento).</li></ul>"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "4.3 Cómo se mantiene estable el codo"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "Un esquema que merece la pena memorizar, porque indica qué estructura ha fallado tras una lesión."
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Estabilizadores primarios</strong>",
              "<strong>Articulación humerocubital</strong> (el gancho óseo) · <strong>fascículo anterior del LCC</strong> (valgo) · <strong>complejo del LCL, especialmente el LCCL</strong> (varo y rotatoria)"
            ],
            [
              "<strong>Estabilizadores secundarios</strong>",
              "<strong>Cabeza radial</strong> (valgo) · <strong>orígenes comunes de los flexores y extensores</strong> (compresión dinámica) · <strong>cápsula anterior</strong>"
            ],
            [
              "<strong>Estabilizadores dinámicos</strong>",
              "Los músculos que cruzan la articulación —ancóneo, la masa flexopronadora, el tríceps"
            ]
          ],
          "columns": [
            "<strong>Nivel</strong>",
            "<strong>Estructuras</strong>"
          ]
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "4.3.1 El círculo de Horii"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>La luxación de codo no es un evento único, sino una <strong>secuencia</strong>, y los tejidos blandos fallan en un orden predecible <strong>de lateral a medial</strong> (O'Driscoll):</li><li><strong>Estadio 1</strong> — disrupción del LCCL → inestabilidad rotatoria posterolateral.</li><li><strong>Estadio 2</strong> — resto de estructuras laterales y cápsula anterior/posterior → luxación incompleta (encajada, \"perched\").</li><li><strong>Estadio 3</strong> — el LCC falla en último lugar → luxación completa.</li><li>La <strong>\"tríada terrible\"</strong> = luxación de codo + <strong>fractura de la cabeza radial</strong> + <strong>fractura de la coronoides</strong>. Se pierden tanto los estabilizadores secundarios como los primarios, por lo que es notoriamente inestable y rígida.</li></ul>"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>La consecuencia para la rehabilitación.</strong> Tras una luxación simple, el codo suele ser estable en el arco medio e inestable en los extremos. La movilización <strong>activa</strong> precoz dentro de un arco protegido, con el antebrazo posicionado para proteger el lado lesionado —<strong>la pronación protege el lado lateral (LCCL), la supinación protege el lado medial (LCC)</strong>— preserva la movilidad sin riesgo de reluxación.<br><br>La inmovilización prolongada es el enemigo: <strong>la rigidez del codo es mucho más incapacitante y mucho más difícil de tratar que una laxitud residual leve.</strong>",
          "color": "accent",
          "label": "Perla clínica en MFR"
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "5. Músculos"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "5.1 Cómo organizarlos"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Brazo anterior (flexores):</strong> bíceps braquial, braquial, braquiorradial.</li><li><strong>Brazo posterior (extensores):</strong> tríceps braquial, ancóneo.</li><li><strong>Masa común flexopronadora</strong> desde el epicóndilo <strong>medial</strong>.</li><li><strong>Masa común extensora-supinadora</strong> desde el epicóndilo <strong>lateral</strong>.</li></ul>"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "Las dos masas son imágenes especulares, y sus patologías también lo son: <br><ul><li><strong>epicóndilo medial = flexores y pronadores = codo de golfista</strong>;&nbsp;</li><li><strong>epicóndilo lateral = extensores y supinadores = codo de tenista</strong>.</li></ul>",
          "color": "green",
          "label": "Regla mnemotécnica"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "5.2 Los flexores del codo"
        }
      },
      {
        "block_type": "rich_table",
        "content_config": {
          "rows": [
            {
              "cells": [
                "<strong>Origen</strong>",
                "Cabeza larga: tubérculo supraglenoideo. Cabeza corta: apófisis coracoides"
              ]
            },
            {
              "cells": [
                "<strong>Inserción</strong>",
                "<strong>Tuberosidad radial (bicipital)</strong>, además de la <strong>aponeurosis bicipital (lacertus fibrosus)</strong> hacia la fascia profunda del antebrazo"
              ]
            },
            {
              "cells": [
                "<strong>Inervación</strong>",
                "<strong>Nervio musculocutáneo (C5, C6)</strong>"
              ]
            },
            {
              "cells": [
                "<strong>Acción</strong>",
                "El <strong>supinador más potente</strong>, especialmente con el codo flexionado a 90°; un potente flexor del codo cuando el antebrazo está en supinación"
              ]
            },
            {
              "cells": [
                "<strong>Relevancia clínica</strong>",
                "Al ser el principal supinador, la rotura del bíceps distal supone la pérdida de <strong>~40–50% de la fuerza de supinación</strong> pero solo de ~30% de la fuerza de flexión. <strong>La prueba del gancho (hook test)</strong> (enganchar un dedo bajo el tendón desde el lado lateral) es la prueba exploratoria más fiable. El <strong>lacertus fibrosus</strong> puede permanecer íntegro y enmascarar la retracción —la ausencia de una deformidad en \"Popeye\" no descarta la rotura"
              ]
            }
          ],
          "title": "Bíceps braquial",
          "columns": [
            {
              "type": "text",
              "title": "Campo"
            },
            {
              "type": "text",
              "title": "Detalle"
            }
          ]
        }
      },
      {
        "block_type": "rich_table",
        "content_config": {
          "rows": [
            {
              "cells": [
                "<strong>Origen</strong>",
                "Mitad distal de la cara anterior de la diáfisis humeral"
              ]
            },
            {
              "cells": [
                "<strong>Inserción</strong>",
                "<strong>Apófisis coronoides y tuberosidad cubital</strong>"
              ]
            },
            {
              "cells": [
                "<strong>Inervación</strong>",
                "<strong>Musculocutáneo (C5, C6)</strong>, con la porción lateral inervada por el <strong>nervio radial (C7)</strong>"
              ]
            },
            {
              "cells": [
                "<strong>Acción</strong>",
                "El <strong>flexor de carga del codo</strong> —flexiona en cualquier posición del antebrazo porque se inserta en el cúbito, que no rota"
              ]
            },
            {
              "cells": [
                "<strong>Relevancia clínica</strong>",
                "Se sitúa <strong>directamente sobre la cápsula anterior</strong>, por lo que es el músculo que sangra hacia la cápsula tras un traumatismo del codo y el lugar donde con mayor frecuencia se forma la <strong>osificación heterotópica</strong>. Su doble inervación es una curiosidad electromiográfica que conviene conocer: el braquial puede quedar parcialmente respetado en una lesión aislada del musculocutáneo"
              ]
            }
          ],
          "title": "Braquial",
          "columns": [
            {
              "type": "text",
              "title": "Campo"
            },
            {
              "type": "text",
              "title": "Detalle"
            }
          ]
        }
      },
      {
        "block_type": "rich_table",
        "content_config": {
          "rows": [
            {
              "cells": [
                "<strong>Origen</strong>",
                "<strong>Cresta supracondílea lateral</strong> del húmero —no el origen extensor común"
              ]
            },
            {
              "cells": [
                "<strong>Inserción</strong>",
                "Apófisis estiloides del radio"
              ]
            },
            {
              "cells": [
                "<strong>Inervación</strong>",
                "<strong>Nervio radial (C5, C6)</strong>"
              ]
            },
            {
              "cells": [
                "<strong>Acción</strong>",
                "Flexiona el codo, de forma más eficaz con el antebrazo en posición <strong>neutra</strong> (semipronación); devuelve el antebrazo hacia la posición neutra desde cualquiera de los dos extremos"
              ]
            },
            {
              "cells": [
                "<strong>Relevancia clínica</strong>",
                "El clásico <strong>\"flexor inervado por el nervio radial\"</strong>. Al ser C5–C6 pero de distribución radial, es un músculo clave para diferenciar una <strong>radiculopatía C6</strong> de una <strong>neuropatía radial</strong>, y su reflejo (reflejo braquiorradial o \"del supinador largo\") explora C6. Su origen proximal al epicóndilo hace que quede respetado en la epicondilalgia lateral"
              ]
            }
          ],
          "title": "Braquiorradial",
          "columns": [
            {
              "type": "text",
              "title": "Campo"
            },
            {
              "type": "text",
              "title": "Detalle"
            }
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<span class=\"text-sm\"><span class=\"font-bold\">Las 3 B flexionan el codo:</span><br><ul><li><span><span><span><span class=\"font-bold\">B</span>íceps braquial</span></span></span></li><li><span><span><span class=\"font-bold\">B</span>raquial</span></span></li><li><span><span class=\"font-bold\">B</span>raquiorradial</span></li></ul></span>",
          "label": "Idea clave"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "5.3 Los extensores del codo"
        }
      },
      {
        "block_type": "rich_table",
        "content_config": {
          "rows": [
            {
              "cells": [
                "<strong>Origen</strong>",
                "Cabeza larga: <strong>tubérculo infraglenoideo</strong> de la escápula. Cabeza lateral: cara posterior del húmero por encima del surco del nervio radial. Cabeza medial: cara posterior del húmero por debajo del surco"
              ]
            },
            {
              "cells": [
                "<strong>Inserción</strong>",
                "Olécranon, mediante un tendón ancho; algunas fibras continúan hacia la fascia antebraquial"
              ]
            },
            {
              "cells": [
                "<strong>Inervación</strong>",
                "<strong>Nervio radial (C6, C7, C8)</strong> —con predominio de C7"
              ]
            },
            {
              "cells": [
                "<strong>Acción</strong>",
                "El principal extensor del codo. La cabeza larga también extiende y aduce el hombro"
              ]
            },
            {
              "cells": [
                "<strong>Relevancia clínica</strong>",
                "La debilidad del tríceps es incapacitante para cualquier persona que <strong>realice transferencias, use muletas o propulse una silla de ruedas</strong> —valórelo de forma explícita en todo paciente con lesión medular o ictus. El <strong>reflejo tricipital explora C7</strong>. Una <strong>cabeza medial que resalta sobre el epicóndilo</strong> puede causar síntomas del nervio cubital y simular un síndrome del túnel cubital"
              ]
            }
          ],
          "title": "Tríceps braquial",
          "columns": [
            {
              "type": "text",
              "title": "Campo"
            },
            {
              "type": "text",
              "title": "Detalle"
            }
          ]
        }
      },
      {
        "block_type": "rich_table",
        "content_config": {
          "rows": [
            {
              "cells": [
                "<strong>Origen</strong>",
                "Cara posterior del <strong>epicóndilo lateral</strong>"
              ]
            },
            {
              "cells": [
                "<strong>Inserción</strong>",
                "Cara lateral del olécranon y cara posterior proximal del cúbito"
              ]
            },
            {
              "cells": [
                "<strong>Inervación</strong>",
                "<strong>Nervio radial (C7, C8)</strong>, a través de la rama para la cabeza medial del tríceps"
              ]
            },
            {
              "cells": [
                "<strong>Acción</strong>",
                "Asiste en la extensión; <strong>estabiliza el codo frente a las fuerzas en varo y rotatorias posterolaterales</strong> y estabiliza el cúbito durante la pronación"
              ]
            },
            {
              "cells": [
                "<strong>Relevancia clínica</strong>",
                "Pequeño pero útil: es un <strong>estabilizador dinámico posterolateral</strong>, y el <strong>intervalo de Kocher</strong> entre el ancóneo y el extensor cubital del carpo es el abordaje quirúrgico lateral estándar. Puede observarse denervación aquí en la neuropatía radial"
              ]
            }
          ],
          "title": "Ancóneo",
          "columns": [
            {
              "type": "text",
              "title": "Campo"
            },
            {
              "type": "text",
              "title": "Detalle"
            }
          ]
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "5.4 Masa común flexopronadora (epicóndilo medial)"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "e6531000-28ed-4fa7-8b1c-e499a37d2954",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/65f38ccc-fb74-4a5f-9ade-d81d1a198fd7.png"
            },
            {
              "id": "bd8aa816-93bd-4816-94f5-ec420be39588",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/73104ed9-112f-449a-a00e-757ddb1bbfac.png"
            }
          ]
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "Cinco músculos, que se aprenden <strong>de radial a cubital</strong> según su disposición:"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Pronador redondo</strong>",
              "Mediano",
              "C6, C7",
              "Pronación. <strong>Dos cabezas</strong> —el nervio mediano pasa entre ellas, el lugar más frecuente del síndrome del pronador"
            ],
            [
              "<strong>Flexor radial del carpo</strong>",
              "Mediano",
              "C6, C7",
              "Flexión de muñeca y desviación radial"
            ],
            [
              "<strong>Palmar largo</strong>",
              "Mediano",
              "C7–T1",
              "Ausente en ~15%; donante de injerto"
            ],
            [
              "<strong>Flexor superficial de los dedos</strong>",
              "Mediano",
              "C7–T1",
              "Flexión de la IFP. Su <strong>arco fibroso (arcada del sublimis)</strong> es un lugar de compresión del nervio mediano"
            ],
            [
              "<strong>Flexor cubital del carpo</strong>",
              "<strong>Cubital</strong>",
              "C7–T1",
              "El <strong>único músculo de la masa inervado por el nervio cubital</strong>. Sus <strong>dos cabezas forman el techo del túnel cubital</strong>"
            ]
          ],
          "columns": [
            "<strong>Músculo</strong>",
            "<strong>Nervio</strong>",
            "<strong>Raíces</strong>",
            "<strong>Acción / nota</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>La masa flexopronadora es un estabilizador dinámico del valgo</strong>, situada directamente sobre el LCC. En un lanzador con dolor medial de codo, fortalecer esta masa es una intervención mecánica genuina, no un ejercicio genérico —descarga el ligamento.<br><br>La <strong>epicondilalgia medial (codo de golfista)</strong> afecta con mayor frecuencia a los <strong>orígenes del pronador redondo y del flexor radial del carpo</strong>. Dado que el <strong>nervio cubital discurre inmediatamente posterior</strong>, un 20–50% de los pacientes presenta irritación concomitante del nervio cubital. Explore siempre el nervio antes de etiquetarlo como \"solo un codo de golfista\", y mantenga la aguja alejada del surco al infiltrar.",
          "color": "accent",
          "label": "Perla clínica en MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "5.5 Masa común extensora-supinadora (epicóndilo lateral)"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Extensor radial largo del carpo</strong>",
              "<strong>Cresta supracondílea lateral</strong>",
              "Radial",
              "Por encima del origen común —respetado en el codo de tenista; <strong>respetado en la parálisis del NIP</strong>, por lo que la muñeca sigue extendiéndose, aunque en desviación radial"
            ],
            [
              "<strong>Extensor radial corto del carpo</strong>",
              "Origen extensor común",
              "<strong>NIP</strong>",
              "<strong>El tendón de la epicondilalgia lateral.</strong> Su cara profunda roza contra el cóndilo humeral"
            ],
            [
              "<strong>Extensor común de los dedos</strong>",
              "Origen extensor común",
              "NIP",
              "A menudo afectado junto con el extensor radial corto del carpo"
            ],
            [
              "<strong>Extensor del meñique</strong>",
              "Origen extensor común",
              "NIP",
              ""
            ],
            [
              "<strong>Extensor cubital del carpo</strong>",
              "Origen extensor común",
              "NIP",
              "Junto con el ancóneo, forma el intervalo de Kocher"
            ],
            [
              "<strong>Supinador</strong>",
              "Epicóndilo lateral, LCL, ligamento anular, cresta del supinador",
              "<strong>NIP</strong>",
              "El <strong>NIP lo atraviesa por debajo de la arcada de Frohse</strong> —el atrapamiento clásico"
            ]
          ],
          "columns": [
            "<strong>Músculo</strong>",
            "<strong>Origen</strong>",
            "<strong>Nervio</strong>",
            "<strong>Nota</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>La epicondilalgia lateral es una tendinopatía del extensor radial corto del carpo, no una inflamación.</strong> La histología muestra degeneración angiofibroblástica con escaso o nulo infiltrado inflamatorio —razón exacta por la que los corticoides proporcionan alivio a corto plazo pero peores resultados al año que no hacer nada, y por la que la <strong>carga progresiva es el tratamiento basado en la evidencia</strong>.<br><br>Palpe <strong>justo distal y anterior al epicóndilo lateral</strong> —el origen del extensor radial corto del carpo— no la punta del epicóndilo en sí.<br><br><strong>Descarte siempre el síndrome del túnel radial</strong>, que se localiza 3–5 cm distal, sobre el supinador, y produce dolor sin debilidad. Ambos coexisten quizá en un 5–10% de los casos resistentes, y un \"codo de tenista fallido\" suele ser un túnel radial no diagnosticado.",
          "color": "accent",
          "label": "Perla clínica en MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "5.6 Los pronadores y supinadores"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Supinador</strong>",
              "NIP (C6)",
              "Supina con el codo en <strong>extensión</strong>; actúa en solitario en la supinación lenta y sin resistencia"
            ],
            [
              "<strong>Bíceps braquial</strong>",
              "Musculocutáneo (C5–C6)",
              "El supinador potente; se recluta para la supinación <strong>contra resistencia</strong>, con mayor eficacia a 90° de flexión"
            ],
            [
              "<strong>Pronador redondo</strong>",
              "Mediano (C6–C7)",
              "Pronación rápida y potente"
            ],
            [
              "<strong>Pronador cuadrado</strong>",
              "<strong>Interóseo anterior</strong> (C7–T1)",
              "El <strong>pronador principal</strong>; actúa en solitario en la pronación lenta y sin resistencia"
            ]
          ],
          "columns": [
            "<strong>Músculo</strong>",
            "<strong>Nervio</strong>",
            "<strong>Nota</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "Los rotadores <strong>lentos y silenciosos</strong> son los músculos profundos monoarticulares (<strong>supinador</strong> y <strong>pronador cuadrado</strong>). Los <strong>rápidos y potentes</strong> son los grandes músculos biarticulares (<strong>bíceps</strong> y <strong>pronador redondo</strong>). Explore la fuerza de rotación con el codo a 90° para eliminar la sustitución por el hombro.",
          "color": "green",
          "label": "Regla mnemotécnica"
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "6. Neuroanatomía"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "El codo es el segundo lugar más frecuente de atrapamiento nervioso periférico del organismo, después de la muñeca. Tres nervios lo atraviesan, cada uno a través de una serie predecible de túneles. <strong>Aprenda los túneles en orden y la localización se convertirá en aritmética.</strong>"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "caption": "Figura 3 — Puntos de compresión de los tres nervios que cruzan el codo, de proximal a distal.",
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/26e279df-4259-44e9-907d-6fa9883d4970.png",
          "imageWidth": "full"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "6.1 Nervio mediano"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "6.1.1 Trayecto"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Desciende por el brazo <strong>medial a la arteria braquial</strong>, cruza la fosa cubital <strong>medial a la arteria y al tendón del bíceps</strong>.</li><li>Pasa <strong>por debajo del lacertus fibrosus</strong>, después <strong>entre las dos cabezas del pronador redondo</strong>, después <strong>por debajo del arco fibroso del flexor superficial de los dedos</strong>, y continúa hacia el antebrazo.</li><li>El <strong>nervio interóseo anterior (NIA)</strong> se origina aproximadamente <strong>5–8 cm distal a los epicóndilos</strong> e inerva el <strong>flexor largo del pulgar, la mitad radial del flexor profundo de los dedos, y el pronador cuadrado</strong>.</li></ul>"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "6.1.2 Síndromes de compresión"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Ligamento de Struthers</strong>",
              "Desde una <strong>apófisis supracondílea</strong> ~5 cm proximal al epicóndilo medial (presente en ~1%)",
              "Síntomas del nervio mediano; puede comprimir también la arteria braquial. Buscar la espícula ósea en la radiografía"
            ],
            [
              "<strong>Síndrome del pronador</strong>",
              "Lacertus fibrosus, entre las dos cabezas del pronador redondo, o el arco del flexor superficial de los dedos",
              "Dolor sordo en el antebrazo, que empeora con la pronación repetitiva. <strong>La pérdida sensitiva incluye la eminencia tenar</strong> porque está afectada la rama cutánea palmar"
            ],
            [
              "<strong>Síndrome del NIA</strong>",
              "Bandas fibrosas, arco del flexor superficial de los dedos, o (con frecuencia) <strong>amiotrofia neurálgica</strong>",
              "<strong>Puramente motor.</strong> Debilidad del flexor largo del pulgar y del flexor profundo del índice → no puede formar un signo de \"OK\" redondeado; la pinza se vuelve plana y cuadrada. <strong>Sin ninguna pérdida sensitiva</strong>"
            ]
          ],
          "columns": [
            "<strong>Síndrome</strong>",
            "<strong>Localización</strong>",
            "<strong>Hallazgos</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Síndrome del pronador frente a síndrome del túnel carpiano: el elemento diferenciador es la rama cutánea palmar.</strong> Esta abandona el nervio mediano ~5 cm proximal a la muñeca y pasa <strong>por encima</strong> del retináculo flexor, por lo que está <strong>respetada en el STC</strong> pero <strong>afectada en el síndrome del pronador</strong>.<br><br>Así: la hipoestesia de la <strong>propia eminencia tenar</strong> orienta a una lesión proximal; la hipoestesia limitada a los <strong>tres dedos y medio radiales con una zona tenar de piel normal</strong> orienta al túnel carpiano.<br><br><strong>Tenga cautela con la etiqueta \"síndrome del NIA\".</strong> Una gran proporción son en realidad <strong>síndrome de Parsonage-Turner</strong> que se presenta con un patrón de predominio en el NIA —precedido de dolor intenso, y a menudo con afectación sutil fuera del territorio del NIA. Descártelo antes de plantear la descompresión quirúrgica.",
          "color": "violet",
          "label": "EMG / electrodiagnóstico"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "6.2 Nervio cubital"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "6.2.1 Trayecto"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Discurre por la cara medial del brazo, <strong>perfora el tabique intermuscular medial</strong> aproximadamente en la mitad del brazo para entrar en el compartimento posterior.</li><li>Pasa <strong>por detrás del epicóndilo medial, en el surco retrocondíleo</strong>, donde es subcutáneo y directamente palpable.</li><li>Entra en el <strong>túnel cubital</strong>, techado por el <strong>ligamento de Osborne (retináculo del túnel cubital)</strong> entre las dos cabezas del flexor cubital del carpo.</li><li>No da ramas en el brazo; en el antebrazo inerva el <strong>flexor cubital del carpo y la mitad cubital del flexor profundo de los dedos</strong>.</li><li>La <strong>rama cutánea dorsal</strong> nace <strong>5–8 cm proximal a la muñeca</strong>.</li></ul>"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "6.2.2 Por qué la flexión lo empeora"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>El túnel cubital <strong>no es un tubo rígido</strong>. Con la flexión, el retináculo se tensa, el túnel se aplana y su <strong>volumen se reduce aproximadamente un 50–55%</strong>.</li><li>Simultáneamente, el nervio <strong>se alarga unos 5 mm por cada 45° de flexión</strong>, de modo que se estira y se comprime a la vez.</li><li>La presión intraneural se multiplica varias veces en la flexión completa, y aún más con el hombro en abducción —la postura para dormir que despierta a estos pacientes.</li></ul>"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Esta anatomía es el tratamiento.</strong> La intervención de primera línea para el síndrome del túnel cubital no es la cirugía ni la medicación: es la <strong>férula nocturna a 30–45° de extensión</strong> junto con la <strong>modificación de la actividad para evitar la flexión mantenida</strong> (uso del teléfono, dormir encogido, apoyarse sobre el codo).<br><br>Explique el mecanismo al paciente en una frase —\"al doblar el codo se comprime y se estira el nervio al mismo tiempo\"— y la adherencia mejora notablemente.",
          "color": "accent",
          "label": "Perla clínica en MFR"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>La rama cutánea dorsal permite localizar la lesión.</strong> Abandona el nervio cubital muy proximal al canal de Guyon, por lo que:<br><br>La pérdida sensitiva en el <strong>dorso de la mano, en el territorio cubital = lesión a nivel del codo/antebrazo o proximal a este</strong> (túnel cubital).<br><br>La pérdida sensitiva limitada a los <strong>dedos cubitales en su cara palmar, con un dorso normal = lesión a nivel de la muñeca</strong> (canal de Guyon).<br><br><strong>La técnica importa.</strong> La conducción nerviosa a través del codo debe realizarse con el codo <strong>flexionado 70–90°</strong> y el segmento medido a <strong>10 cm</strong>; de lo contrario, la laxitud del nervio en extensión produce una distancia falsamente corta y una velocidad espuriamente lenta. Una caída <strong>superior a 10 m/s a través del codo</strong> o un bloqueo de la conducción constituyen el hallazgo diagnóstico.<br><br>La <strong>anastomosis de Martin-Gruber</strong> (cruce mediano-cubital en el antebrazo, ~15–20% de la población) puede simular un bloqueo de la conducción a nivel del codo. Considérela antes de informar uno.",
          "color": "violet",
          "label": "EMG / electrodiagnóstico"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "La <strong>subluxación del nervio cubital</strong> sobre el epicóndilo medial durante la flexión se produce hasta en un ~20% de las personas asintomáticas. Explórela dinámicamente antes de atribuirle los síntomas —y regístrela antes de cualquier planificación quirúrgica.<br><br>La <strong>parálisis tardía del nervio cubital</strong> aparece años o décadas después de una lesión infantil del cóndilo lateral con el consiguiente <strong>cúbito valgo</strong>, que estira el nervio. Pregunte por antecedentes de fractura de codo en la infancia en todo adulto con una neuropatía cubital inexplicada y un codo en valgo.",
          "color": "red",
          "label": "Trampa diagnóstica — no pasar por alto"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "6.3 Nervio radial"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "6.3.1 Trayecto"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Desciende en espiral por la cara posterior del húmero, en el <strong>surco del nervio radial</strong>, y después <strong>perfora el tabique intermuscular lateral a unos 10 cm proximal al epicóndilo lateral</strong> para entrar en el compartimento anterior.</li><li>Se sitúa en el surco entre el <strong>braquial y el braquiorradial</strong>, y después se divide, aproximadamente a la altura de la articulación radiocapitelar, en:</li><li>— el <strong>nervio radial superficial</strong> (puramente sensitivo, para la cara dorsorradial de la mano), y</li><li>— el <strong>nervio interóseo posterior (NIP)</strong> (puramente motor), que penetra en el <strong>supinador por debajo de la arcada de Frohse</strong>.</li></ul>"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "6.3.2 El túnel radial: cinco puntos potenciales de compresión"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Bandas fibrosas anteriores a la articulación radiocapitelar</li><li>La <strong>arcada de Henry (leash of Henry)</strong> —los vasos recurrentes radiales que cruzan el nervio</li><li>El <strong>borde medial (afilado) del extensor radial corto del carpo</strong></li><li>La <strong>arcada de Frohse</strong> —el borde proximal fibroso del supinador; el lugar más frecuente</li><li>El borde distal del supinador</li></ul>"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Síntoma</strong>",
              "Dolor",
              "Debilidad"
            ],
            [
              "<strong>Debilidad</strong>",
              "<strong>Ninguna</strong>",
              "<strong>Caída de los dedos y del pulgar</strong>"
            ],
            [
              "<strong>Pérdida sensitiva</strong>",
              "Ninguna",
              "Ninguna (el NIP es puramente motor)"
            ],
            [
              "<strong>Extensión de muñeca</strong>",
              "Normal",
              "Presente pero con <strong>desviación radial</strong> —el extensor radial largo del carpo está respetado"
            ],
            [
              "<strong>Dolor a la palpación</strong>",
              "<strong>3–5 cm distal</strong> al epicóndilo lateral, sobre el supinador",
              "Variable"
            ],
            [
              "<strong>EMG</strong>",
              "Con frecuencia normal",
              "Denervación en los músculos inervados por el NIP"
            ]
          ],
          "columns": [
            "",
            "<strong>Síndrome del túnel radial</strong>",
            "<strong>Síndrome del NIP</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>La regla más útil sobre el nervio radial a nivel del codo:</strong> el <strong>NIP es puramente motor</strong> y el <strong>extensor radial largo del carpo se inerva por encima de él</strong>. Así, un paciente con caída de los dedos, una muñeca que aún se extiende (pero se desvía radialmente), y una <strong>sensibilidad completamente normal</strong> tiene una lesión del NIP —no una parálisis del nervio radial a nivel del surco radial, ni una radiculopatía C7.<br><br>Añada el <strong>braquiorradial</strong> al estudio con aguja: es de distribución radial pero <strong>proximal al NIP</strong>, por lo que es normal en la parálisis del NIP y anormal en una lesión a nivel del surco radial.",
          "color": "violet",
          "label": "EMG / electrodiagnóstico"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "6.4 Nervios cutáneos alrededor del codo"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Cutáneo antebraquial lateral</strong>",
              "Rama terminal del nervio <strong>musculocutáneo</strong>",
              "Cara lateral del antebrazo",
              "Emerge lateral al tendón del bíceps —<strong>el nervio que se lesiona en la reparación del bíceps distal</strong> y en venopunciones antecubitales dificultosas"
            ],
            [
              "<strong>Cutáneo antebraquial medial</strong>",
              "<strong>Fascículo medial (C8–T1)</strong>",
              "Cara medial del antebrazo",
              "Su PANS está <strong>reducido en la plexopatía del tronco inferior y en el síndrome del desfiladero torácico neurógeno verdadero</strong> —un estudio clave, porque está respetado en la neuropatía cubital a nivel del codo"
            ],
            [
              "<strong>Cutáneo antebraquial posterior</strong>",
              "Nervio radial, en el brazo",
              "Cara posterior del antebrazo",
              "Respetado en las lesiones del NIP; afectado en las lesiones radiales altas"
            ]
          ],
          "columns": [
            "<strong>Nervio</strong>",
            "<strong>Origen</strong>",
            "<strong>Territorio</strong>",
            "<strong>Relevancia</strong>"
          ]
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "6.5 Resumen de localización"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Flexión del codo</strong>",
              "Débil",
              "Normal",
              "Braquiorradial débil",
              "Normal"
            ],
            [
              "<strong>Extensión del codo</strong>",
              "Normal",
              "<strong>Débil</strong>",
              "<strong>Débil</strong>",
              "Normal"
            ],
            [
              "<strong>Extensión de muñeca</strong>",
              "Débil",
              "Débil",
              "<strong>Débil (caída)</strong>",
              "Presente, con <strong>desviación radial</strong>"
            ],
            [
              "<strong>Extensión de los dedos</strong>",
              "Normal",
              "Débil",
              "Débil",
              "<strong>Débil</strong>"
            ],
            [
              "<strong>Pérdida sensitiva</strong>",
              "Pulgar, cara lateral del antebrazo",
              "Dedo medio",
              "Primer espacio interdigital dorsal",
              "<strong>Ninguna</strong>"
            ],
            [
              "<strong>Reflejo</strong>",
              "Braquiorradial, bicipital",
              "<strong>Tricipital</strong>",
              "El reflejo tricipital puede estar conservado",
              "Normal"
            ]
          ],
          "columns": [
            "",
            "<strong>Radiculopatía C6</strong>",
            "<strong>Radiculopatía C7</strong>",
            "<strong>Radial (surco del nervio radial)</strong>",
            "<strong>NIP</strong>"
          ]
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "7. Anatomía vascular y la fosa cubital"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "7.1 Arteria braquial"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Desciende hacia la fosa <strong>medial al tendón del bíceps y lateral al nervio mediano</strong>.</li><li>Se divide, aproximadamente a la altura del <strong>cuello radial</strong>, en las arterias <strong>radial</strong> y <strong>cubital</strong>.</li><li>Está cubierta por la <strong>aponeurosis bicipital</strong>, que la separa de la vena mediana cubital —la razón anatómica por la que la venopunción suele ser segura en esta zona.</li></ul>"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "7.2 La red anastomótica alrededor del codo"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Una rica red colateral permite que la extremidad sobreviva a la oclusión de la arteria braquial. Combina ramas <strong>colaterales</strong> procedentes de proximal con ramas <strong>recurrentes</strong> procedentes de distal.</li></ul>"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Medial</strong>",
              "Colateral cubital superior e inferior",
              "Recurrente cubital anterior y posterior"
            ],
            [
              "<strong>Lateral</strong>",
              "Colateral radial (de la arteria braquial profunda)",
              "Recurrente radial"
            ],
            [
              "<strong>Posterior</strong>",
              "Colateral media (de la arteria braquial profunda)",
              "Recurrente interósea"
            ]
          ],
          "columns": [
            "<strong>Lado</strong>",
            "<strong>Desde proximal (colaterales)</strong>",
            "<strong>Desde distal (recurrentes)</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>La fractura supracondílea en el niño es la amenaza clásica para esta arteria.</strong> El fragmento proximal desplazado puede lesionar la arteria braquial y el nervio mediano.<br><br>Vigile la <strong>contractura isquémica de Volkmann</strong> —síndrome compartimental del antebrazo que produce fibrosis de los flexores profundos y una garra fija. El signo más precoz es el <strong>dolor con la extensión pasiva de los dedos</strong>, no la ausencia de pulso. Un pulso palpable <strong>no</strong> descarta el síndrome compartimental.",
          "color": "red",
          "label": "Trampa diagnóstica — no pasar por alto"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "7.3 La fosa cubital"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Superior (base)</strong>",
              "Línea imaginaria entre ambos epicóndilos"
            ],
            [
              "<strong>Lateral</strong>",
              "Braquiorradial"
            ],
            [
              "<strong>Medial</strong>",
              "Pronador redondo"
            ],
            [
              "<strong>Suelo</strong>",
              "Braquial y supinador"
            ],
            [
              "<strong>Techo</strong>",
              "Piel, fascia superficial (con la vena mediana cubital), fascia profunda, reforzada por la <strong>aponeurosis bicipital</strong>"
            ]
          ],
          "columns": [
            "<strong>Límite</strong>",
            "<strong>Estructura</strong>"
          ]
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Contenido, de lateral a medial:</strong> Nervio radial (bajo el braquiorradial) · <strong>Tendón del bíceps</strong> · <strong>Arteria braquial</strong> · <strong>Nervio mediano</strong>.</li></ul>"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>\"Really Need Beer To Be At My Nicest\"</strong> (mnemotecnia en inglés: <strong>R</strong>adial <strong>N</strong>erve, <strong>B</strong>iceps <strong>T</strong>endon, <strong>B</strong>rachial <strong>A</strong>rtery, <strong>M</strong>edian <strong>N</strong>erve) — de lateral a medial: nervio radial, tendón del bíceps, arteria braquial, nervio mediano.<br><br>Más sencillo aún para los tres elementos centrales: <strong>TAN</strong> — <strong>T</strong>endón, <strong>A</strong>rteria, <strong>N</strong>ervio, de lateral a medial.",
          "color": "green",
          "label": "Regla mnemotécnica"
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "Repaso rápido"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "8.1 Problemas frecuentes relacionados con la anatomía"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Epicondilalgia lateral</strong>",
              "Origen del extensor radial corto del carpo",
              "Tendinopatía degenerativa, no inflamación → cargar el tendón, no infiltrarlo repetidamente"
            ],
            [
              "<strong>Epicondilalgia medial</strong>",
              "Orígenes del pronador redondo y del flexor radial del carpo",
              "El nervio cubital discurre inmediatamente posterior → explorarlo en todos los casos"
            ],
            [
              "<strong>Síndrome del túnel cubital</strong>",
              "Nervio cubital a nivel del ligamento de Osborne",
              "La flexión estrecha el túnel y estira el nervio → férula nocturna en extensión"
            ],
            [
              "<strong>Síndrome del túnel radial</strong>",
              "NIP bajo la arcada de Frohse",
              "Dolor 3–5 cm distal al epicóndilo sin debilidad → el \"codo de tenista fallido\""
            ],
            [
              "<strong>Rotura del bíceps distal</strong>",
              "Tendón a nivel de la tuberosidad radial",
              "Predomina la debilidad de la supinación → prueba del gancho; el nervio cutáneo antebraquial lateral está en riesgo durante la reparación"
            ],
            [
              "<strong>Bursitis olecraniana</strong>",
              "Bolsa subcutánea",
              "Extraarticular → tumefacción con movilidad conservada"
            ],
            [
              "<strong>Sobrecarga en valgo-extensión</strong>",
              "LCC + zona posteromedial del olécranon",
              "Lanzadores: laxitud del LCC → pinzamiento posteromedial y osteofitos"
            ],
            [
              "<strong>Rigidez postraumática</strong>",
              "Cápsula, braquial, fascículo posterior del LCC",
              "Una sola cápsula, el braquial sobre la cápsula → pérdida global y alto riesgo de osificación heterotópica (OH)"
            ]
          ],
          "columns": [
            "<strong>Presentación</strong>",
            "<strong>Estructura</strong>",
            "<strong>Explicación anatómica</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Osificación heterotópica: el codo es la articulación más frecuentemente afectada en el miembro superior</strong>, en particular tras una fractura-luxación, quemaduras, y en pacientes con <strong>traumatismo craneoencefálico o lesión medular</strong>.<br><br>Razón anatómica: el <strong>braquial se sitúa directamente sobre la cápsula anterior</strong>, de modo que el hematoma y la lesión muscular quedan en contacto con el periostio.<br><br>Implicaciones prácticas: vigile la aparición de una <strong>meseta o reversión de las ganancias de rango junto con un codo caliente, indurado y doloroso</strong> en las primeras semanas tras la lesión; utilice una <strong>movilización activa suave en lugar de un estiramiento pasivo forzado</strong>, que la provoca; y recuerde que la manipulación agresiva precoz es un desencadenante reconocido.",
          "color": "accent",
          "label": "Perla clínica en MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "8.2 Quince perlas"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Tres articulaciones, una cápsula</strong> —el derrame, la contractura y la infiltración afectan a las tres por igual.</li><li><strong>El arco funcional es de 30–130° con 50°/50° de rotación.</strong> Fije los objetivos según la función, no según el rango completo.</li><li><strong>El codo se mantiene a 70–80° porque ahí el volumen capsular es máximo</strong> —un signo importante de derrame.</li><li><strong>Una almohadilla grasa posterior visible indica derrame, y en el contexto traumático, una fractura oculta.</strong></li><li><strong>CRITOE:</strong> el epicóndilo medial se osifica antes que la tróclea —un núcleo \"troclear\" sin epicóndilo medial es un fragmento avulsionado atrapado.</li><li><strong>El fascículo anterior del LCC, desde el epicóndilo hasta el tubérculo sublime, es el principal freno al valgo.</strong></li><li><strong>El LCCL es el principal freno a la inestabilidad rotatoria posterolateral</strong> —protéjalo de las infiltraciones profundas de corticoides en la cara lateral.</li><li><strong>La pronación protege el lado lateral; la supinación protege el lado medial</strong> al rehabilitar una luxación.</li><li><strong>El braquial se sitúa sobre la cápsula anterior</strong> —la razón por la que el codo es el punto caliente de osificación heterotópica del miembro superior.</li><li><strong>El braquiorradial es un flexor inervado por el nervio radial</strong> —el músculo clave para diferenciar una radiculopatía C6 de una neuropatía radial.</li><li><strong>El extensor radial largo del carpo se origina por encima del origen extensor común</strong> —respetado en el codo de tenista y en la parálisis del NIP, por lo que la muñeca sigue extendiéndose pero se desvía radialmente.</li><li><strong>El NIP es puramente motor; el síndrome del túnel radial es puramente doloroso.</strong> Debilidad más sensibilidad normal localiza la lesión de inmediato.</li><li><strong>La rama cutánea palmar diferencia el síndrome del pronador del síndrome del túnel carpiano</strong> —la hipoestesia tenar orienta a una lesión proximal.</li><li><strong>La rama cutánea dorsal diferencia el túnel cubital del canal de Guyon</strong> —la hipoestesia dorsal cubital orienta al codo.</li><li><strong>Compruebe la relación de los tres puntos antes y después de cada reducción.</strong></li></ul>"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "8.3 Signos de alarma"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Codo caliente, tumefacto, exquisitamente doloroso y mantenido inmóvil</strong> → artritis séptica. Realizar siempre la artrocentesis antes de administrar corticoides.</li><li><strong>Tumefacción posterior fluctuante con fiebre o celulitis</strong> → bursitis olecraniana séptica.</li><li><strong>Dolor con la extensión pasiva de los dedos tras una fractura supracondílea</strong> → síndrome compartimental. Un pulso presente no lo descarta.</li><li><strong>Pérdida progresiva de rango con un codo caliente e indurado tras un traumatismo o una lesión cerebral</strong> → osificación heterotópica.</li><li><strong>Dolor intenso seguido de debilidad parcheada, a menudo de predominio en el NIA</strong> → amiotrofia neurálgica, no una neuropatía compresiva.</li><li><strong>Dolor nocturno, dolor en reposo o síntomas sistémicos con una exploración mecánica normal</strong> → solicitar pruebas de imagen; considerar infección o tumor.</li><li><strong>Neuropatía cubital de nueva aparición en un adulto con cúbito valgo</strong> → parálisis tardía del nervio cubital; preguntar por antecedente de fractura en la infancia.</li></ul>"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "Solo anatomía. La biomecánica del codo —el eje de rotación, la carga en valgo durante el lanzamiento, la transmisión de fuerzas y la cinemática de la inestabilidad— se trata por separado."
        }
      }
    ]
  },
  {
    "slug": "elbow-anatomy-pt-pt",
    "canonicalName": "Anatomia do Cotovelo (PT)",
    "blocks": [
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<strong>Um Capítulo Didático para Internos e Especialistas de Medicina Física e de Reabilitação</strong> — Edição para Internos.<br><br>Apenas anatomia. A biomecânica é tratada em separado."
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "1. Visão Geral"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageUrl": "/api/uploads/illustrations/aad94af2-0b38-4067-ba22-e9ae8ec3c6ae.png"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "O ombro orienta o membro superior. <strong>O cotovelo posiciona a mão no espaço e controla a distância entre a mão e o corpo.</strong> Todas as consequências funcionais da patologia do cotovelo decorrem deste facto: um cotovelo rígido é incapacitante de uma forma que um punho rígido não é, porque o doente deixa de conseguir levar a mão à face, ao períneo ou ao chão."
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "1.1 Três articulações dentro de uma única cápsula"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "Este é o facto estrutural mais importante do cotovelo, e a razão pela qual os seus problemas se comportam da forma como se comportam. Três articulações partilham <strong>uma única cavidade sinovial e uma única cápsula</strong>, pelo que um processo em qualquer uma delas — sangue, pus, sinovite, aderência — envolve as três."
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Umerocubital</strong>",
              "Dobradiça (gínglimo)",
              "Tróclea ↔ incisura troclear do cúbito",
              "Flexão/extensão; <strong>o principal estabilizador ósseo</strong>"
            ],
            [
              "<strong>Umerorradial</strong>",
              "Enartrose modificada",
              "Capítulo ↔ cabeça do rádio",
              "Flexão/extensão + rotação; transmite ~60% da carga axial"
            ],
            [
              "<strong>Radiocubital proximal</strong>",
              "Pivot (trocóide)",
              "Cabeça do rádio ↔ incisura radial do cúbito, dentro do ligamento anular",
              "Pronação/supinação"
            ]
          ],
          "columns": [
            "<strong>Articulação</strong>",
            "<strong>Tipo</strong>",
            "<strong>Entre</strong>",
            "<strong>Função</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Uma cápsula = três consequências que vai encontrar semanalmente.</strong><br><br>1. Uma <strong>hemartrose ou derrame</strong> distende toda a articulação, pelo que o doente perde a flexão, a extensão e a rotação em simultâneo.<br><br>2. A <strong>contratura capsular pós-traumática afeta as três</strong> — razão pela qual a rigidez pós-traumática do cotovelo é tão global e tão difícil de tratar.<br><br>3. Uma <strong>única injeção intra-articular</strong> atinge as três articulações. Não é necessário visá-las separadamente.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "1.2 Amplitude de movimento — total e funcional"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "67bc11b4-e1f0-4e23-aadb-b97aeb3c6d28",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/973ac19d-f914-4a7d-b890-9fb8e3632d97.png",
              "imageFit": "contain"
            },
            {
              "id": "f8276dd4-eb59-4ed2-9cf2-f3b67339d8c7",
              "label": ""
            }
          ]
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Flexão – extensão</strong>",
              "0–140° (até 10° de hiperextensão em laxidão ligamentar)",
              "<strong>30–130°</strong>"
            ],
            [
              "<strong>Pronação</strong>",
              "80-90º",
              "<strong>50°</strong>"
            ],
            [
              "<strong>Supinação</strong>",
              "80–90°",
              "<strong>50°</strong>"
            ]
          ],
          "columns": [
            "<strong>Movimento</strong>",
            "<strong>Amplitude total</strong>",
            "<strong>Arco funcional (Morrey)</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Use o arco funcional, não a amplitude total, para definir os objetivos de reabilitação.</strong> Um doente que atinja 30–130° de flexão com 50° de pronação e supinação consegue realizar quase todas as atividades de vida diária. Perseguir os últimos 20° de extensão num cotovelo rígido pós-traumático custa muitas vezes mais em dor, inflamação e risco de ossificação heterotópica do que aquilo que devolve em função.<br><br>A exceção é a <strong>perda de extensão em quem precisa de alcance</strong> (utilizadores de canadianas ou cadeira de rodas, trabalhadores manuais) e a <strong>perda de flexão em qualquer doente</strong>, porque é a flexão que leva a mão à face.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "1.3 O ângulo de carreamento"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Com o cotovelo <strong>em extensão completa e supinado</strong>, o antebraço desvia-se lateralmente em relação ao eixo do braço: esta inclinação em valgo é o <strong>ângulo de carreamento</strong>.</li><li>Normal: aproximadamente <strong>11–14° nos homens e 13–16° nas mulheres</strong> (referem-se intervalos de 5–20°). Existe para que o antebraço, ao oscilar, não colida com a bacia.</li><li><strong>Diminui progressivamente com a flexão</strong> e desaparece (ou inverte-se para um ligeiro varo) em flexão completa. Deve medir-se sempre em extensão completa com a palma virada para a frente, ou o valor não tem significado.</li><li>O <strong>cúbito valgo</strong> (aumento do ângulo) resulta mais frequentemente de consolidação viciosa do côndilo lateral ou de paragem do crescimento — e é a causa clássica da <strong>paralisia cubital tardia</strong>, que surge anos após a lesão da infância.</li><li>O <strong>cúbito varo</strong> (\"deformidade em coronha de espingarda\") resulta de fratura supracondiliana consolidada em posição viciosa. É sobretudo estético, mas associa-se a instabilidade rotatória posterolateral tardia.</li></ul>"
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "2. Osteologia"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "0a0b3bff-d1f9-475f-8ec5-ef75641fbb06",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/f0287290-86ed-4f00-a0ba-d0b6d0b6fcf8.png",
              "imageFit": "contain"
            },
            {
              "id": "56d09677-e78c-406a-9586-28f37dcb59a6",
              "label": ""
            }
          ]
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "2.1 Úmero distal"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "2.1.1 O conceito das duas colunas"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>O úmero distal pode ser imaginado como um <strong>triângulo</strong>:&nbsp;</li><ul><li><span class=\"font-bold\">coluna </span><strong>medial</strong></li><li><strong>coluna lateral</strong>&nbsp;</li><li><strong>superfície articular (tróclea + capítulo)</strong>, suspensa entre ambas como a travessa.</li></ul></ul><br><ul><li>Isto explica os padrões de fratura e a estratégia de fixação, e explica também por que motivo o úmero distal é relativamente fino entre as fossas — há osso nas margens, não no centro.</li></ul>"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/feb57bb7-993c-4770-beb3-d315869bbe2a.png",
          "imageWidth": "3/4"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "2.1.2 Superfícies articulares"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Tróclea</strong> — a superfície medial, em forma de carrinho de bobina, que articula com o cúbito. Tem um sulco profundo e cobre cerca de 300° de arco, o que confere à articulação umerocubital a sua estabilidade intrínseca.</li><li><strong>Capítulo</strong> — a superfície lateral, quase esférica, que articula com a cabeça do rádio. Cobre apenas a metade <strong>anterior</strong> do côndilo lateral, razão pela qual a cabeça do rádio só articula com ele em flexão, e pela qual as lesões do capítulo (osteocondrite dissecante) se apresentam com sintomas relacionados com a flexão.</li><li><strong>Orientação:</strong>&nbsp;</li><ul><li>o bloco articular está rodado aproximadamente <strong>30° para anterior</strong> em relação à diáfise umeral</li><li>inclinado cerca de <strong>6° em valgo</strong></li><li><span class=\"font-bold\">rodado internamente cerca de <strong>5</strong></span><strong>°</strong></li><li>A perda dessa inclinação anterior após uma fratura supracondiliana consolidada em posição viciosa bloqueia mecanicamente a flexão — nenhuma quantidade de terapia a irá restaurar.</li></ul></ul>"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "2.1.3 Fossas"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Fossa coronoide</strong> (anteromedial) — recebe o processo coronoide em flexão completa.</li><li><strong>Fossa radial</strong> (anterolateral) — recebe a cabeça do rádio em flexão completa.</li><li><strong>Fossa olecraniana</strong> (posterior) — recebe o olecrânio em extensão completa, e é onde se aloja, oculta, a <strong>almofada adiposa posterior</strong>.</li></ul>"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "2.1.4 Epicôndilos"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Epicôndilo medial</strong> — maior, não articular, projetando-se posteromedialmente. Origem da <strong>massa flexora-pronadora comum</strong> e do <strong>ligamento colateral cubital</strong>. O <strong>nervo cubital corre num sulco imediatamente posterior a ele</strong>.</li><li><strong>Epicôndilo lateral</strong> — mais pequeno. Origem da <strong>massa extensora comum</strong> e do <strong>complexo ligamentar colateral lateral</strong>.</li><li><strong>Cristas supracondilianas</strong> — a crista lateral dá origem ao <strong>braquiorradial e ao extensor radial longo do carpo (ECRL)</strong>, razão pela qual estes dois músculos não fazem parte da origem extensora comum e são poupados na epicondilalgia lateral.</li></ul>"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/f1260b78-a910-4bc1-b5a7-ab5a87950271.png",
          "imageWidth": "3/4"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/8fb37ad4-3920-4d8d-864f-631805a0da82.png",
          "imageWidth": "3/4"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/ef715896-8e8b-4a8d-a7ed-962fd72786d1.png",
          "imageWidth": "1/2"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "2.2 Cúbito proximal"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<span></span>O cúbito proximal forma uma cavidade em sela profunda e altamente congruente com a tróclea umeral, atuando como um estabilizador estático primário da articulação.<span>\n</span><b><br></b><ul><li><strong>Incisura troclear (grande incisura sigmóide)</strong> — um gancho de ~190° que envolve a tróclea. É a origem da estabilidade óssea do cotovelo.</li><li><strong>Área desnuda transversa</strong> — uma faixa naturalmente desprovida de cartilagem que atravessa o meio da incisura troclear, separando as facetas articulares do olecrânio e do processo coronoide. <strong>É normal. Não deve ser reportada como um defeito condral.</strong></li><li><strong>Olecrânio</strong> — a projeção posterior subcutânea; inserção do <strong>tricípite</strong>. A sua ponta entra na fossa olecraniana em extensão.</li><li><strong>Processo coronoide</strong> — o contraforte anterior. É o principal bloqueio à subluxação posterior; a deficiência do coronoide desestabiliza o cotovelo de forma desproporcional ao tamanho do fragmento.</li><li><strong>Tubérculo sublime</strong> — no coronoide medial: <strong>inserção do fascículo anterior do LCU</strong>. Memorize este nome; surge em todos os relatórios sobre o cotovelo do lançador.</li><li><strong>Incisura radial (pequena incisura sigmóide)</strong> — lateral, articulando com a cabeça do rádio.</li><li><strong>Crista do supinador</strong> — que se estende distalmente a partir da incisura radial: <strong>inserção do ligamento colateral cubital lateral</strong>.</li></ul>"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/f602a3dd-bdcb-46a5-8139-87a13a8694ed.png"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "2.3 Rádio proximal"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "8794b9fe-3703-4bab-a881-bda9cc51a491",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/3366de96-fb08-4cdf-90d9-9cefeb52d87b.png",
              "imageFit": "contain"
            },
            {
              "id": "8bafed7a-1102-4bda-bec1-cdd6b34cdc0d",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/476433a0-7441-4bd4-89c5-51d5c46c84c3.png",
              "imageFit": "contain"
            },
            {
              "id": "fe15e347-25bf-4bc9-8b0a-3a2e5ed67b1d",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/d219e8d1-2019-49ef-9432-f4d44d434a05.png"
            }
          ]
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<span></span>A cabeça do rádio atua como um importante estabilizador estático secundário da articulação do cotovelo.<span></span><b><br></b><ul><li><strong>Cabeça do rádio</strong> — em forma de disco, com uma cavidade côncava para o capítulo. É <strong>elíptica, não circular</strong>, razão pela qual deve ser corretamente alinhada quando substituída ou fixada.</li><ul><li class=\"\" data-start-index=\"3142\"><span><span class=\"underline\">Cobertura Articular</span>: <span class=\"font-bold\">A cartilagem hialina cobre</span> a cúpula articular côncava proximal (que contacta com o capítulo) e estende-se por um arco de aproximadamente<span class=\"font-bold\"> 240° ao longo do rebordo externo </span>(que contacta com a incisura radial do cúbito).</span></li><li class=\"\" data-start-index=\"3142\"><span><span class=\"underline\">Zona de Segurança Cirúrgica</span>: O <span class=\"font-bold\">arco restante de 120° do rebordo não é </span><span class=\"font-bold\">coberto por cartilagem</span> e é utilizado pelos cirurgiões para colocação de material de osteossíntese durante a redução e fixação interna de fraturas desviadas da cabeça do rádio.</span></li></ul><li><strong>Colo do rádio</strong> — a constrição abaixo da cabeça, ligeiramente angulada lateralmente.</li><li><strong>Tuberosidade radial (bicipital)</strong> — no colo anteromedial: <strong>inserção do tendão distal do bicípite</strong>.</li></ul><br>Funcionalmente, a cabeça do rádio é o <strong>estabilizador secundário mais importante ao valgo</strong>. Pode ser excisada num cotovelo com o LCU íntegro, mas a excisão num cotovelo com deficiência do LCU produz instabilidade grosseira."
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "2.4 Desenvolvimento Pediátrico e a Mnemónica CRITOE - Núcleos de ossificação"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<span></span>Em fisiatria pediátrica, o cotovelo é uma das regiões mais desafiantes do ponto de vista diagnóstico devido ao <span class=\"font-bold\">aparecimento não simultâneo de seis núcleos de ossificação secundários</span>. <br><br>Interpretar erradamente estas estruturas em desenvolvimento como \"fragmentos\" é uma fonte frequente de <span class=\"font-bold\">erro iatrogénico</span>. <br>O domínio da ordem cronológica de aparecimento destes núcleos não é opcional para o clínico.<br><br><span></span>"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>C</strong>",
              "<span class=\"font-bold\">C</span>apítulo (Capitellum)",
              "1"
            ],
            [
              "<strong>R</strong>",
              "<span class=\"font-bold\">R</span>adial head (cabeça do rádio)",
              "3"
            ],
            [
              "<strong>I</strong>",
              "<span class=\"font-bold\">I</span>nternal (medial) epicondyle (epicôndilo medial)",
              "5"
            ],
            [
              "<strong>T</strong>",
              "<span class=\"font-bold\">T</span>rochlea (tróclea)",
              "7"
            ],
            [
              "<strong>O</strong>",
              "<span class=\"font-bold\">O</span>lecranon (olecrânio)",
              "9"
            ],
            [
              "<strong>E</strong>",
              "<span class=\"font-bold\">E</span>xternal (lateral) epicondyle (epicôndilo lateral)",
              "11"
            ]
          ],
          "columns": [
            "<strong>Ordem</strong>",
            "<strong>Núcleo</strong>",
            "<strong>Idade aproximada (anos)</strong>"
          ]
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>As idades são aproximadas e surgem <strong>1–2 anos mais cedo nas raparigas</strong>. A <strong>ordem</strong> é fiável; as idades exatas não são.</li></ul>"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/0770a7ed-e245-4dc8-a406-a7c14251e12a.png",
          "imageWidth": "2/3"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<i data-start-index=\"2295\" class=\"\"></i>Lembre-se de que a ossificação no sexo <span class=\"font-bold\">feminino</span> ocorre tipicamente cerca de <span class=\"font-bold\">dois anos mais cedo</span> do que estes marcos padrão.<br><br>Para prevenir erros de diagnóstico, recorremos a <span class=\"underline\"></span><span class=\"font-bold\">3 pilares diagnósticos</span><span class=\"underline\"></span>:<br><ul><li><span class=\"underline\">Regra da Ordem</span>: Os <span class=\"font-bold\">núcleos devem surgir na sequência CRITOE</span>. Se a tróclea for visível mas o epicôndilo medial estiver ausente, deve suspeitar-se de uma avulsão ou luxação.</li><li><span class=\"underline\">Regra da Idade</span>: Se uma estrutura semelhante a um núcleo de ossificação <span class=\"font-bold\">surgir anos antes da sua janela cronológica</span> (por exemplo, um \"olecrânio\" aos 5 anos), é <span class=\"font-bold\">patognomónico de um fragmento de fratura</span>.</li><li><span class=\"underline\">Morfologia</span>: Os verdadeiros núcleos de ossificação são <span class=\"font-bold\">lisos, arredondados e tipicamente simétricos</span> em relação ao membro contralateral. As fraturas caracterizam-se por bordos irregulares, angulosos e não congruentes.</li></ul><br><span></span>A aplicação mais útil do CRITOE →&nbsp;<span class=\"font-bold\">O <span>epicôndilo medial ossifica sempre antes da tróclea</span>.</span><ul><li>Assim, se observar um núcleo de ossificação na região da tróclea mas <span>sem epicôndilo medial</span>, o fragmento \"troclear\" é, na verdade, um <span>epicôndilo medial avulsionado</span> — frequentemente encarcerado dentro da articulação após uma luxação que se reduziu espontaneamente.</li><li>Isto impõe o axioma pediátrico fundamental: <span class=\"font-bold\"><span class=\"italic\">\"Epicôndilo medial ausente = procurar dentro da articulação.\"</span></span></li></ul><span data-start-index=\"3293\" class=\"\"></span>",
          "label": "Ponto-chave"
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "3. A Cápsula Articular, as Almofadas Adiposas e as Bolsas Serosas"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "3.1 Cápsula"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "aa9e8e34-d1c1-4d1c-8ed3-0f7fe895bd31",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/5ed674b8-68e4-4f85-a38c-8defb885cee4.png",
              "imageFit": "contain"
            },
            {
              "id": "7b91e183-9f19-4716-a988-eabf1d6c0617",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/3dca7b04-5d0f-4773-a9dd-13ba57f700c1.png",
              "imageFit": "contain"
            },
            {
              "id": "589f2777-f1ef-4ecc-8be4-0708a5b72607",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/f3f0ad7f-b511-4bc1-b088-b9416d94ff61.png"
            }
          ]
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Uma única cápsula engloba as três articulações. Fixa-se proximalmente acima das fossas coronoide e radial, anteriormente, e acima da fossa olecraniana, posteriormente, e distalmente ao coronoide, ao ligamento anular e ao olecrânio.</li><li>É <strong>fina e frágil anterior e posteriormente</strong> (onde permite o movimento) e <strong>espessa medial e lateralmente</strong>, formando os ligamentos colaterais (onde confere estabilidade).</li><li>A capacidade normal é de aproximadamente <strong>25–30 mL</strong>.</li><li><strong>A capacidade é máxima por volta dos 70–80° de flexão.</strong></li></ul>"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Porque é que o doente mantém o cotovelo a 70–80°?</strong>&nbsp;<br>Porque é nessa posição que o volume capsular é máximo, correspondendo à posição de menor pressão intra-articular e menor dor quando a articulação está distendida. Um doente sentado com o cotovelo mantido a cerca de 80°, recusando-se a movê-lo, tem um <strong>derrame até prova em contrário</strong> — sangue, pus ou sinovite.<br><br>O mesmo facto tem duas aplicações práticas: <br><ul><li>é a <strong>posição de conforto para imobilizar um cotovelo agudamente inflamado</strong>,&nbsp;</li><li>é a <strong>posição de maior rendimento para aspiração</strong>.</li></ul><br>É também um aviso. Imobilizar um cotovelo nessa posição confortável de meia-flexão é exatamente a forma como se cria uma <strong>contratura em flexão</strong>. Imobilize de forma aguda para conforto, depois mobilize precocemente.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "3.2 Almofadas adiposas"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "205ba01f-d015-4926-901a-81973e7ca74b",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/912ac264-fb37-4dc2-bd7b-50b26f4da542.png",
              "imageFit": "contain"
            },
            {
              "id": "f5101b6f-848e-4808-9ac6-a5402f491bd5",
              "label": ""
            }
          ]
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "3 almofadas adiposas situam-se <strong>dentro da cápsula mas fora da sinovial</strong> (intracapsulares, extrassinoviais): anterior (coronoide + radial) e posterior (olecraniana).<br><ul><li>A <strong>almofada adiposa anterior</strong> é normalmente visível numa radiografia de perfil como uma fina linha radiotransparente junto ao úmero.</li><li>A <strong>almofada adiposa posterior é normalmente invisível</strong>, porque se aloja profundamente na fossa olecraniana.</li></ul>"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Uma almofada adiposa posterior visível numa radiografia de perfil verdadeiro em flexão de 90° indica um derrame intra-articular — e, em contexto de trauma, uma fratura oculta até prova em contrário.</strong> No adulto pense na cabeça do rádio; na criança pense em supracondiliana.<br><br>Uma almofada adiposa anterior deslocada e elevada constitui o <strong>\"sinal da vela\"</strong>, com o mesmo significado.<br><br>Uma radiografia com aspeto normal mas com sinal da almofada adiposa positivo <strong>não é um cotovelo normal</strong>. Trate como fratura, imobilize e repita a imagem.",
          "color": "red",
          "label": "Armadilha — não perder"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "3.3 Bolsas serosas"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "bb73a723-5db3-4c56-991f-da266426edce",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/5a6704d4-f3a6-4539-a088-7225a0841f84.png"
            },
            {
              "id": "4e274d8b-5380-4ea1-9042-d6896d417eb5",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/eecfbbba-2478-45ef-a931-f6437ee3e131.png"
            },
            {
              "id": "70f63dfc-02df-4544-a88e-139b06ebe4db",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/5ec1a4c9-17e7-4656-bf36-1a4a7e248e77.png"
            }
          ]
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Olecraniana (subcutânea)</strong>",
              "Entre a pele e o olecrânio, superficial à inserção do tricípite",
              "A bursite mais comum do corpo. Traumática, inflamatória (gota, AR) ou <strong>séptica</strong> — e a posição superficial torna a infeção frequente. <strong>Extra-articular</strong>, pelo que uma bolsa tumefacta com mobilidade do cotovelo preservada é bursite, não artrite"
            ],
            [
              "<strong>Bicipitorradial</strong>",
              "Entre o tendão distal do bicípite e a tuberosidade radial",
              "Inflama-se com a supinação repetitiva; causa de dor anterior do cotovelo e ocasionalmente de irritação do NIP"
            ],
            [
              "<strong>Interóssea (cubital)</strong>",
              "Entre o tendão do bicípite e o cúbito",
              "Pouco comum"
            ]
          ],
          "columns": [
            "<strong>Bolsa serosa</strong>",
            "<strong>Localização</strong>",
            "<strong>Relevância clínica</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Distinguir a bursite olecraniana da artrite do cotovelo à cabeceira do doente:</strong> <br><ul><li>A bursite dá uma tumefação posterior bem delimitada e flutuante, com <strong>amplitude de movimento passivo quase completa</strong>.&nbsp;</li><li>A artrite ou um derrame dão um cotovelo difusamente tumefacto, mantido a 70–80°, com <strong>movimento doloroso e restrito em todos os planos</strong>.</li></ul><br><strong>Aspire pelo lado lateral, nunca diretamente através do ápice posterior</strong> — a pele posterior é fina, mal vascularizada e suporta carga ao apoiar o cotovelo, pelo que uma punção posterior facilmente evolui para um trajeto fistuloso crónico.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "4. Ligamentos e Estabilidade"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "4.1 Complexo ligamentar colateral medial (cubital)"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "Um complexo triangular com três componentes, dos quais <strong>apenas um tem verdadeira relevância clínica</strong>."
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Fascículo anterior</strong>",
              "Epicôndilo medial anteroinferior → <strong>tubérculo sublime</strong> do coronoide",
              "Ao longo de todo o arco de <strong>20–120°</strong>; as suas bandas anterior e posterior tensionam-se reciprocamente, pelo que alguma parte está sempre tensa",
              "<strong>O principal contentor do valgo.</strong> A estrutura lesada nos lançadores e reconstruída na cirurgia de \"Tommy John\""
            ],
            [
              "<strong>Fascículo posterior</strong><strong> (de Bardinet)</strong>",
              "Epicôndilo medial → margem medial do olecrânio; em forma de leque",
              "Além dos <strong>90°</strong> de flexão",
              "Secundário. <strong>A sua contratura é uma causa major de contratura em flexão pós-traumática</strong>"
            ],
            [
              "<strong>Ligamento transverso (de Cooper)</strong>",
              "Olecrânio → coronoide, i.e. do cúbito para o cúbito",
              "—",
              "Não atravessa nenhuma articulação. Não contribui de forma relevante para a estabilidade"
            ]
          ],
          "columns": [
            "<strong>Componente</strong>",
            "<strong>Trajeto</strong>",
            "<strong>Tenso quando</strong>",
            "<strong>Importância</strong>"
          ]
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/38fefb17-8cf2-47e1-8529-a56f90dc8e6c.png"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "Como o fascículo anterior tem origem <strong>posterior ao eixo de rotação</strong>, tensiona-se à medida que o cotovelo flete. É essa a base anatómica do <strong>teste de stress em valgo dinâmico</strong>: dor reproduzida entre aproximadamente 70° e 120° enquanto o cotovelo é movido sob uma carga em valgo constante.<br><br>A <strong>apófise do epicôndilo medial é mais fraca do que o ligamento num atleta esqueleticamente imaturo</strong>. Assim, a mesma sobrecarga em valgo que rompe o LCU num adulto produz <strong>apofisite do epicôndilo medial (\"cotovelo da Little League\")</strong> numa criança. Mesmo mecanismo, ponto de falência diferente — e abordagem terapêutica completamente diferente.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "4.2 Complexo ligamentar colateral lateral"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Ligamento colateral cubital lateral (LCUL)</strong>",
              "Epicôndilo lateral → <strong>crista do supinador</strong> do cúbito, passando superficialmente ao ligamento anular",
              "<strong>Principal contentor da instabilidade rotatória posterolateral (IRPL).</strong> A estrutura lateral crítica"
            ],
            [
              "<strong>Ligamento colateral radial</strong>",
              "Epicôndilo lateral → funde-se com o ligamento anular",
              "Praticamente <strong>isométrico</strong> ao longo de todo o arco; resiste ao varo"
            ],
            [
              "<strong>Ligamento anular</strong>",
              "Envolve a cabeça do rádio, fixando-se às margens anterior e posterior da incisura radial do cúbito",
              "Mantém a cabeça do rádio encostada ao cúbito. <strong>Em forma de funil, mais estreito distalmente</strong> — razão pela qual a cabeça se mantém contida"
            ],
            [
              "<strong>LCL acessório</strong>",
              "Ligamento anular → crista do supinador",
              "Estabiliza o ligamento anular durante o stress em varo"
            ]
          ],
          "columns": [
            "<strong>Componente</strong>",
            "<strong>Trajeto</strong>",
            "<strong>Função</strong>"
          ]
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/0c8df9ba-f440-47d6-9cb5-40bacee5e6c3.png"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Porque é que o LCUL importa ao fisiatra?</strong>&nbsp;<br>É a estrutura cuja falência produz <strong>instabilidade rotatória posterolateral</strong> — um doente que descreve estalidos, ressaltos ou apreensão ao levantar-se de uma cadeira com o antebraço em supinação.<br><br><span class=\"underline\">Duas causas</span> que deve conhecer: <br><ol><li>após uma <strong>luxação do cotovelo</strong></li><li><strong>iatrogénica</strong> — por cirurgia excessivamente agressiva ou infiltrações repetidas de corticoide profundo para epicondilalgia lateral. Teste com o <strong>chair push-up test</strong>, o <strong>tabletop relocation test</strong>, ou o pivot-shift lateral.</li></ol><br>Esta é uma razão clínica direta para manter as infiltrações de corticoide no cotovelo de ténis superficiais, pouco frequentes e, idealmente, para preferir outras opções.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "4.2.1 O ligamento anular e o cotovelo da ama"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Numa criança com menos de cerca de 5 anos, a cabeça do rádio ainda não está totalmente formada e o ligamento anular é relativamente laxo.</li><li>Uma <strong>tração axial súbita sobre o antebraço pronado e em extensão</strong> permite que o ligamento anular deslize proximalmente sobre a cabeça do rádio e fique encarcerado na articulação radiocapitelar — o <strong>\"cotovelo puxado\"</strong>.</li><li>A criança mantém o braço <strong>pronado e ligeiramente fletido</strong>, recusa-se a usá-lo, e <strong>não apresenta tumefação nem dor localizada à palpação</strong>. As radiografias são normais.</li><li>A redução faz-se por <strong>supinação com flexão</strong>, ou por <strong>hiperpronação</strong> (que tem uma taxa de sucesso à primeira tentativa ligeiramente superior).</li></ul>"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "4.3 Como o cotovelo se mantém estável"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "Um esquema que vale a pena memorizar, porque indica o que falhou após uma lesão."
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Estabilizadores primários</strong>",
              "<strong>Articulação umerocubital</strong> (o gancho ósseo) · <strong>fascículo anterior do LCU</strong> (valgo) · <strong>complexo do LCL, sobretudo o LCUL</strong> (varo e rotatório)"
            ],
            [
              "<strong>Estabilizadores secundários</strong>",
              "<strong>Cabeça do rádio</strong> (valgo) · <strong>origens comuns dos flexores e extensores</strong> (compressão dinâmica) · <strong>cápsula anterior</strong>"
            ],
            [
              "<strong>Estabilizadores dinâmicos</strong>",
              "Os músculos que atravessam a articulação — ancóneo, a massa flexora-pronadora, tricípite"
            ]
          ],
          "columns": [
            "<strong>Nível</strong>",
            "<strong>Estruturas</strong>"
          ]
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "4.3.1 O círculo de Horii"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>A luxação do cotovelo não é um evento único, mas sim uma <strong>sequência</strong>, e os tecidos moles falham por uma ordem previsível, <strong>de lateral para medial</strong> (O'Driscoll):</li><li><strong>Estádio 1</strong> — disrupção do LCUL → instabilidade rotatória posterolateral.</li><li><strong>Estádio 2</strong> — restantes estruturas laterais e cápsula anterior/posterior → luxação incompleta (encravada).</li><li><strong>Estádio 3</strong> — o LCU falha por último → luxação completa.</li><li>A <strong>\"tríade terrível\"</strong> = luxação do cotovelo + <strong>fratura da cabeça do rádio</strong> + <strong>fratura do coronoide</strong>. Perdem-se tanto os estabilizadores secundários como os primários, pelo que é notoriamente instável e rígida.</li></ul>"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>A consequência para a reabilitação.</strong> Após uma luxação simples, o cotovelo é habitualmente estável no arco médio e instável nos extremos. A mobilização <strong>ativa</strong> precoce num arco protegido, com o antebraço posicionado para proteger o lado lesado — <strong>a pronação protege o lado lateral (LCUL), a supinação protege o lado medial (LCU)</strong> — preserva o movimento sem arriscar nova luxação.<br><br>A imobilização prolongada é a inimiga: <strong>a rigidez do cotovelo é muito mais incapacitante e muito mais difícil de tratar do que uma ligeira laxidão residual.</strong>",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "5. Músculos"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "5.1 Como organizá-los"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Braço anterior (flexores):</strong> bicípite braquial, braquial, braquiorradial.</li><li><strong>Braço posterior (extensores):</strong> tricípite braquial, ancóneo.</li><li><strong>Massa flexora-pronadora comum</strong> a partir do epicôndilo <strong>medial</strong>.</li><li><strong>Massa extensora-supinadora comum</strong> a partir do epicôndilo <strong>lateral</strong>.</li></ul>"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "As duas massas são imagens em espelho, e as suas patologias também: <br><ul><li><strong>epicôndilo medial = flexores e pronadores = cotovelo de golfista</strong>;&nbsp;</li><li><strong>epicôndilo lateral = extensores e supinadores = cotovelo de ténis</strong>.</li></ul>",
          "color": "green",
          "label": "Ajuda mnemónica"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "5.2 Os flexores do cotovelo"
        }
      },
      {
        "block_type": "rich_table",
        "content_config": {
          "rows": [
            {
              "cells": [
                "<strong>Origem</strong>",
                "Cabeça longa: tubérculo supraglenoideu. Cabeça curta: processo coracoide"
              ]
            },
            {
              "cells": [
                "<strong>Inserção</strong>",
                "<strong>Tuberosidade radial (bicipital)</strong>, e também a <strong>aponevrose bicipital (lacertus fibrosus)</strong> na fáscia profunda do antebraço"
              ]
            },
            {
              "cells": [
                "<strong>Inervação</strong>",
                "<strong>Nervo musculocutâneo (C5, C6)</strong>"
              ]
            },
            {
              "cells": [
                "<strong>Ação</strong>",
                "O <strong>supinador mais potente</strong>, sobretudo com o cotovelo fletido a 90°; um flexor potente do cotovelo quando o antebraço está em supinação"
              ]
            },
            {
              "cells": [
                "<strong>Relevância clínica</strong>",
                "Por ser o principal supinador, a rotura distal do bicípite custa <strong>~40–50% da força de supinação</strong> mas apenas ~30% da força de flexão. O <strong>teste do gancho</strong> (colocar um dedo em gancho sob o tendão pelo lado lateral) é o teste clínico mais fiável. O <strong>lacertus fibrosus</strong> pode manter-se íntegro e mascarar a retração — a ausência de deformidade em Popeye não exclui a rotura"
              ]
            }
          ],
          "title": "Bicípite braquial",
          "columns": [
            {
              "type": "text",
              "title": "Campo"
            },
            {
              "type": "text",
              "title": "Detalhe"
            }
          ]
        }
      },
      {
        "block_type": "rich_table",
        "content_config": {
          "rows": [
            {
              "cells": [
                "<strong>Origem</strong>",
                "Metade distal da face anterior da diáfise umeral"
              ]
            },
            {
              "cells": [
                "<strong>Inserção</strong>",
                "<strong>Processo coronoide e tuberosidade ulnar</strong>"
              ]
            },
            {
              "cells": [
                "<strong>Inervação</strong>",
                "<strong>Musculocutâneo (C5, C6)</strong>, com a porção lateral inervada pelo <strong>nervo radial (C7)</strong>"
              ]
            },
            {
              "cells": [
                "<strong>Ação</strong>",
                "O <strong>flexor de trabalho do cotovelo</strong> — flete em qualquer posição do antebraço porque se insere no cúbito, que não roda"
              ]
            },
            {
              "cells": [
                "<strong>Relevância clínica</strong>",
                "Situa-se <strong>diretamente sobre a cápsula anterior</strong>, sendo por isso o músculo que sangra para dentro da cápsula após traumatismo do cotovelo e o local onde a <strong>ossificação heterotópica</strong> mais frequentemente se forma. A sua dupla inervação é uma curiosidade eletromiográfica a conhecer: o braquial pode estar parcialmente poupado numa lesão isolada do nervo musculocutâneo"
              ]
            }
          ],
          "title": "Braquial",
          "columns": [
            {
              "type": "text",
              "title": "Campo"
            },
            {
              "type": "text",
              "title": "Detalhe"
            }
          ]
        }
      },
      {
        "block_type": "rich_table",
        "content_config": {
          "rows": [
            {
              "cells": [
                "<strong>Origem</strong>",
                "<strong>Crista supracondiliana lateral</strong> do úmero — não a origem extensora comum"
              ]
            },
            {
              "cells": [
                "<strong>Inserção</strong>",
                "Processo estiloide do rádio"
              ]
            },
            {
              "cells": [
                "<strong>Inervação</strong>",
                "<strong>Nervo radial (C5, C6)</strong>"
              ]
            },
            {
              "cells": [
                "<strong>Ação</strong>",
                "Flete o cotovelo, mais eficazmente com o antebraço em <strong>neutro</strong> (meia-pronação); devolve o antebraço à posição neutra a partir de qualquer um dos extremos"
              ]
            },
            {
              "cells": [
                "<strong>Relevância clínica</strong>",
                "O clássico <strong>\"flexor inervado pelo nervo radial\"</strong>. Por ser C5–C6 mas radial, é um músculo-chave para distinguir uma <strong>radiculopatia C6</strong> de uma <strong>neuropatia radial</strong>, e o seu reflexo (reflexo braquiorradial) testa C6. A sua origem proximal ao epicôndilo faz com que seja poupado na epicondilalgia lateral"
              ]
            }
          ],
          "title": "Braquiorradial",
          "columns": [
            {
              "type": "text",
              "title": "Campo"
            },
            {
              "type": "text",
              "title": "Detalhe"
            }
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<span class=\"text-sm\"><span class=\"font-bold\">Os 3 B's fletem o cotovelo:</span><br><ul><li><span><span><span><span class=\"font-bold\">B</span>icípite braquial</span></span></span></li><li><span><span><span class=\"font-bold\">B</span>raquial</span></span></li><li><span><span class=\"font-bold\">B</span>raquiorradial</span></li></ul></span>",
          "label": "Ponto-chave"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "5.3 Os extensores do cotovelo"
        }
      },
      {
        "block_type": "rich_table",
        "content_config": {
          "rows": [
            {
              "cells": [
                "<strong>Origem</strong>",
                "Cabeça longa: <strong>tubérculo infraglenoideu</strong> da omoplata. Cabeça lateral: face posterior do úmero acima do sulco espiral. Cabeça medial: face posterior do úmero abaixo do sulco"
              ]
            },
            {
              "cells": [
                "<strong>Inserção</strong>",
                "Olecrânio, através de um tendão largo; algumas fibras prolongam-se para a fáscia antebraquial"
              ]
            },
            {
              "cells": [
                "<strong>Inervação</strong>",
                "<strong>Nervo radial (C6, C7, C8)</strong> — predomínio de C7"
              ]
            },
            {
              "cells": [
                "<strong>Ação</strong>",
                "O principal extensor do cotovelo. A cabeça longa também estende e aduz o ombro"
              ]
            },
            {
              "cells": [
                "<strong>Relevância clínica</strong>",
                "Um tricípite fraco é incapacitante para quem <strong>faz transferências, usa canadianas ou propulsiona uma cadeira de rodas</strong> — avalie-o explicitamente em todo doente com lesão medular ou AVC. O <strong>reflexo tricipital testa C7</strong>. Uma <strong>cabeça medial que ressalta sobre o epicôndilo</strong> pode causar sintomas do nervo cubital e simular uma síndrome do túnel cubital"
              ]
            }
          ],
          "title": "Tricípite braquial",
          "columns": [
            {
              "type": "text",
              "title": "Campo"
            },
            {
              "type": "text",
              "title": "Detalhe"
            }
          ]
        }
      },
      {
        "block_type": "rich_table",
        "content_config": {
          "rows": [
            {
              "cells": [
                "<strong>Origem</strong>",
                "Face posterior do <strong>epicôndilo lateral</strong>"
              ]
            },
            {
              "cells": [
                "<strong>Inserção</strong>",
                "Face lateral do olecrânio e face posterior proximal do cúbito"
              ]
            },
            {
              "cells": [
                "<strong>Inervação</strong>",
                "<strong>Nervo radial (C7, C8)</strong>, através do ramo para a cabeça medial do tricípite"
              ]
            },
            {
              "cells": [
                "<strong>Ação</strong>",
                "Auxilia a extensão; <strong>estabiliza o cotovelo contra as forças em varo e rotatórias posterolaterais</strong> e estabiliza o cúbito durante a pronação"
              ]
            },
            {
              "cells": [
                "<strong>Relevância clínica</strong>",
                "Pequeno mas útil: é um <strong>estabilizador posterolateral dinâmico</strong>, e o <strong>intervalo de Kocher</strong>, entre o ancóneo e o ECU, é a via de abordagem cirúrgica lateral padrão. Pode observar-se denervação aqui na neuropatia radial"
              ]
            }
          ],
          "title": "Ancóneo",
          "columns": [
            {
              "type": "text",
              "title": "Campo"
            },
            {
              "type": "text",
              "title": "Detalhe"
            }
          ]
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "5.4 Massa flexora-pronadora comum (epicôndilo medial)"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "e6531000-28ed-4fa7-8b1c-e499a37d2954",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/65f38ccc-fb74-4a5f-9ade-d81d1a198fd7.png"
            },
            {
              "id": "bd8aa816-93bd-4816-94f5-ec420be39588",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/73104ed9-112f-449a-a00e-757ddb1bbfac.png"
            }
          ]
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "Cinco músculos, memorizados <strong>de radial para cubital</strong>, pela ordem em que se dispõem:"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Pronador redondo</strong>",
              "Mediano",
              "C6, C7",
              "Pronação. <strong>Duas cabeças</strong> — o nervo mediano passa entre elas, o local mais comum da síndrome do pronador"
            ],
            [
              "<strong>Flexor radial do carpo</strong>",
              "Mediano",
              "C6, C7",
              "Flexão do punho e desvio radial"
            ],
            [
              "<strong>Palmar longo</strong>",
              "Mediano",
              "C7–T1",
              "Ausente em ~15%; um dador de enxerto"
            ],
            [
              "<strong>Flexor superficial dos dedos</strong>",
              "Mediano",
              "C7–T1",
              "Flexão da IFP. O seu <strong>arco fibroso (arco do sublimis)</strong> é um local de compressão do nervo mediano"
            ],
            [
              "<strong>Flexor cubital do carpo</strong>",
              "<strong>Cubital</strong>",
              "C7–T1",
              "O <strong>único músculo da massa inervado pelo nervo cubital</strong>. As suas <strong>duas cabeças formam o teto do túnel cubital</strong>"
            ]
          ],
          "columns": [
            "<strong>Músculo</strong>",
            "<strong>Nervo</strong>",
            "<strong>Raízes</strong>",
            "<strong>Ação / nota</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>A massa flexora-pronadora é um estabilizador dinâmico do valgo</strong>, situando-se diretamente sobre o LCU. Num lançador com dor medial do cotovelo, fortalecer esta massa é uma intervenção mecânica genuína, não um exercício genérico — descarrega o ligamento.<br><br>A <strong>epicondilalgia medial (cotovelo de golfista)</strong> envolve mais frequentemente as origens do <strong>pronador redondo e do flexor radial do carpo</strong>. Como o <strong>nervo cubital se situa imediatamente posterior</strong>, 20–50% dos doentes têm irritação concomitante do nervo cubital. Examine sempre o nervo antes de rotular como \"apenas cotovelo de golfista\", e mantenha a agulha afastada do sulco ao infiltrar.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "5.5 Massa extensora-supinadora comum (epicôndilo lateral)"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Extensor radial longo do carpo</strong>",
              "<strong>Crista supracondiliana lateral</strong>",
              "Radial",
              "Acima da origem comum — poupado no cotovelo de ténis; <strong>poupado na paralisia do NIP</strong>, pelo que o punho continua a estender-se, embora com desvio radial"
            ],
            [
              "<strong>Extensor radial curto do carpo</strong>",
              "Origem extensora comum",
              "<strong>NIP</strong>",
              "<strong>O tendão da epicondilalgia lateral.</strong> A sua face profunda atrita contra o capítulo"
            ],
            [
              "<strong>Extensor comum dos dedos</strong>",
              "Origem extensora comum",
              "NIP",
              "Frequentemente envolvido junto com o ECRB"
            ],
            [
              "<strong>Extensor próprio do 5º dedo</strong>",
              "Origem extensora comum",
              "NIP",
              ""
            ],
            [
              "<strong>Extensor cubital do carpo</strong>",
              "Origem extensora comum",
              "NIP",
              "Com o ancóneo, forma o intervalo de Kocher"
            ],
            [
              "<strong>Supinador</strong>",
              "Epicôndilo lateral, LCL, lig. anular, crista do supinador",
              "<strong>NIP</strong>",
              "O <strong>NIP atravessa-o por baixo da arcada de Frohse</strong> — o local clássico de encarceramento"
            ]
          ],
          "columns": [
            "<strong>Músculo</strong>",
            "<strong>Origem</strong>",
            "<strong>Nervo</strong>",
            "<strong>Nota</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>A epicondilalgia lateral é uma tendinopatia do ECRB, não uma inflamação.</strong> A histologia mostra degenerescência angiofibroblástica com pouco ou nenhum infiltrado inflamatório — razão exata pela qual o corticoide dá alívio a curto prazo mas piores resultados ao fim de um ano do que não fazer nada, e pela qual a <strong>carga progressiva é o tratamento com evidência científica</strong>.<br><br>Palpe <strong>imediatamente distal e anterior ao epicôndilo lateral</strong> — a origem do ECRB — não a ponta do epicôndilo propriamente dita.<br><br><strong>Exclua sempre a síndrome do túnel radial</strong>, que se situa 3–5 cm distalmente, sobre o supinador, e provoca dor sem fraqueza. As duas coexistem em talvez 5–10% dos casos resistentes, e um \"cotovelo de ténis que falhou\" é muitas vezes um túnel radial não diagnosticado.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "5.6 Os pronadores e supinadores"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Supinador</strong>",
              "NIP (C6)",
              "Supina com o cotovelo em <strong>extensão</strong>; atua sozinho na supinação lenta e não resistida"
            ],
            [
              "<strong>Bicípite braquial</strong>",
              "Musculocutâneo (C5–C6)",
              "O supinador potente; recrutado na supinação <strong>resistida</strong>, mais eficaz a 90° de flexão"
            ],
            [
              "<strong>Pronador redondo</strong>",
              "Mediano (C6–C7)",
              "Pronação rápida e potente"
            ],
            [
              "<strong>Pronador quadrado</strong>",
              "<strong>Interósseo anterior</strong> (C7–T1)",
              "O <strong>pronador principal</strong>; atua sozinho na pronação lenta e não resistida"
            ]
          ],
          "columns": [
            "<strong>Músculo</strong>",
            "<strong>Nervo</strong>",
            "<strong>Nota</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "Os rotadores <strong>lentos e discretos</strong> são os músculos profundos monoarticulares (<strong>supinador</strong> e <strong>pronador quadrado</strong>). Os <strong>rápidos e potentes</strong> são os grandes músculos biarticulares (<strong>bicípite</strong> e <strong>pronador redondo</strong>). Teste a força de rotação com o cotovelo a 90° para eliminar a substituição pelo ombro.",
          "color": "green",
          "label": "Ajuda mnemónica"
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "6. Neuroanatomia"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "O cotovelo é o segundo local mais comum de encarceramento de nervo periférico no corpo, depois do punho. Três nervos atravessam-no, cada um através de uma série previsível de túneis. <strong>Aprenda os túneis pela ordem e a localização torna-se aritmética.</strong>"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "caption": "Figura 3 — Locais de compressão dos três nervos que atravessam o cotovelo, de proximal para distal.",
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/26e279df-4259-44e9-907d-6fa9883d4970.png",
          "imageWidth": "full"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "6.1 Nervo mediano"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "6.1.1 Trajeto"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Desce o braço <strong>medialmente à artéria braquial</strong>, atravessa a fossa cubital <strong>medialmente à artéria e ao tendão do bicípite</strong>.</li><li>Passa <strong>sob o lacertus fibrosus</strong>, depois <strong>entre as duas cabeças do pronador redondo</strong>, depois <strong>sob o arco fibroso do flexor superficial dos dedos</strong>, e continua para o antebraço.</li><li>O <strong>nervo interósseo anterior (NIA)</strong> emerge cerca de <strong>5–8 cm distalmente aos epicôndilos</strong> e inerva o <strong>flexor longo do polegar, a metade radial do flexor profundo dos dedos, e o pronador quadrado</strong>.</li></ul>"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "6.1.2 Síndromes de compressão"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Ligamento de Struthers</strong>",
              "A partir de um <strong>processo supracondiliano</strong> ~5 cm acima do epicôndilo medial (presente em ~1%)",
              "Sintomas medianos; pode também comprimir a artéria braquial. Procure o esporão ósseo na radiografia"
            ],
            [
              "<strong>Síndrome do pronador</strong>",
              "Lacertus fibrosus, entre as duas cabeças do pronador redondo, ou o arco do FDS",
              "Dor no antebraço, tipo peso, agravada pela pronação repetitiva. <strong>A perda sensitiva inclui a eminência tenar</strong> porque o ramo cutâneo palmar está envolvido"
            ],
            [
              "<strong>Síndrome do NIA</strong>",
              "Bandas fibrosas, arco do FDS, ou (frequentemente) <strong>amiotrofia nevrálgica</strong>",
              "<strong>Puramente motora.</strong> Fraqueza do FPL e do FDP para o indicador → incapacidade de formar um sinal de \"OK\" arredondado; a pinça torna-se plana e quadrada. <strong>Sem qualquer perda sensitiva</strong>"
            ]
          ],
          "columns": [
            "<strong>Síndrome</strong>",
            "<strong>Local</strong>",
            "<strong>Achados</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Síndrome do pronador versus síndrome do túnel cárpico — o elemento discriminador é o ramo cutâneo palmar.</strong> Este abandona o nervo mediano cerca de 5 cm proximalmente ao punho e passa <strong>por cima</strong> do retináculo flexor, pelo que é <strong>poupado no STC</strong> mas <strong>envolvido na síndrome do pronador</strong>.<br><br>Assim: dormência da <strong>própria eminência tenar</strong> aponta para proximal; dormência limitada aos <strong>três dedos e meio radiais com pele tenar normal</strong> aponta para o túnel cárpico.<br><br><strong>Cuidado com o rótulo \"síndrome do NIA\".</strong> Uma proporção significativa corresponde na realidade a <strong>síndrome de Parsonage–Turner</strong> apresentando-se com um padrão predominantemente do NIA — precedida de dor intensa, e frequentemente com envolvimento subtil fora do território do NIA. Procure-a antes de propor descompressão.",
          "color": "violet",
          "label": "EMG / eletrodiagnóstico"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "6.2 Nervo cubital"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "6.2.1 Trajeto"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Desce pelo braço medial, <strong>perfura o septo intermuscular medial</strong> aproximadamente a meio do braço para entrar no compartimento posterior.</li><li>Passa <strong>por trás do epicôndilo medial, no sulco retrocondiliano</strong>, onde é subcutâneo e diretamente palpável.</li><li>Entra no <strong>túnel cubital</strong>, com teto formado pelo <strong>ligamento de Osborne (o retináculo do túnel cubital)</strong>, entre as duas cabeças do flexor cubital do carpo.</li><li>Não dá ramos no braço; no antebraço inerva o <strong>FCU e a metade cubital do FDP</strong>.</li><li>O <strong>ramo cutâneo dorsal</strong> tem origem <strong>5–8 cm proximalmente ao punho</strong>.</li></ul>"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "6.2.2 Porque a flexão o agrava"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>O túnel cubital <strong>não é um tubo rígido</strong>. Com a flexão, o retináculo tensiona-se, o túnel achata-se e o seu <strong>volume reduz-se em cerca de 50–55%</strong>.</li><li>O nervo simultaneamente <strong>alonga-se cerca de 5 mm por cada 45° de flexão</strong>, pelo que fica estirado e comprimido ao mesmo tempo.</li><li>A pressão intraneural aumenta várias vezes em flexão completa, e ainda mais com o ombro em abdução — a postura de dormir que acorda estes doentes.</li></ul>"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Esta anatomia é o tratamento.</strong> A intervenção de primeira linha para a síndrome do túnel cubital não é a cirurgia nem a medicação: é a <strong>tala noturna a 30–45° de extensão</strong> associada à <strong>modificação de atividades para evitar a flexão sustentada</strong> (uso do telemóvel, dormir enrolado, apoiar-se no cotovelo).<br><br>Explique o mecanismo ao doente numa frase — \"dobrar o cotovelo aperta e estica o nervo ao mesmo tempo\" — e a adesão melhora drasticamente.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>O ramo cutâneo dorsal localiza a lesão.</strong> Abandona o nervo cubital bem proximalmente ao canal de Guyon, pelo que:<br><br>Perda sensitiva no <strong>dorso da mão, no território cubital = lesão ao nível ou acima do cotovelo/antebraço</strong> (túnel cubital).<br><br>Perda sensitiva limitada aos <strong>dedos cubitais palmares, com dorso normal = lesão ao nível do punho</strong> (canal de Guyon).<br><br><strong>A técnica é importante.</strong> A condução nervosa através do cotovelo deve ser realizada com o cotovelo <strong>fletido a 70–90°</strong> e o segmento medido a <strong>10 cm</strong>, caso contrário a folga do nervo em extensão produz uma distância falsamente curta e uma velocidade falsamente lenta. Uma redução de <strong>>10 m/s através do cotovelo</strong> ou um bloqueio de condução é o achado diagnóstico.<br><br>A <strong>anastomose de Martin–Gruber</strong> (comunicação mediano-cubital no antebraço, ~15–20% das pessoas) pode simular um bloqueio de condução ao nível do cotovelo. Considere-a antes de reportar um.",
          "color": "violet",
          "label": "EMG / eletrodiagnóstico"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "A <strong>subluxação do nervo cubital</strong> sobre o epicôndilo medial em flexão ocorre em até ~20% das pessoas assintomáticas. Procure-a dinamicamente antes de atribuir sintomas a ela — e registe-a antes de qualquer planeamento cirúrgico.<br><br>A <strong>paralisia cubital tardia</strong> surge anos ou décadas após uma lesão do côndilo lateral na infância, com <strong>cúbito valgo</strong> resultante, que estira o nervo. Pergunte sobre fratura do cotovelo na infância em qualquer adulto com neuropatia cubital inexplicada e cotovelo em valgo.",
          "color": "red",
          "label": "Armadilha — não perder"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "6.3 Nervo radial"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "6.3.1 Trajeto"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Desce em espiral pela face posterior do úmero, no <strong>sulco espiral</strong>, e depois <strong>perfura o septo intermuscular lateral cerca de 10 cm acima do epicôndilo lateral</strong> para entrar no compartimento anterior.</li><li>Situa-se no sulco entre o <strong>braquial e o braquiorradial</strong>, dividindo-se depois, aproximadamente ao nível da articulação radiocapitelar, em:</li><li>— o <strong>nervo radial superficial</strong> (puramente sensitivo, para a face dorsorradial da mão), e</li><li>— o <strong>nervo interósseo posterior (NIP)</strong> (puramente motor), que penetra no <strong>supinador por baixo da arcada de Frohse</strong>.</li></ul>"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "6.3.2 O túnel radial — cinco potenciais pontos de compressão"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Bandas fibrosas anteriores à articulação radiocapitelar</li><li>O <strong>leash de Henry</strong> — os vasos recorrentes radiais que cruzam o nervo</li><li>A <strong>margem medial (afiada) do ECRB</strong></li><li>A <strong>arcada de Frohse</strong> — a margem proximal fibrosa do supinador; o local mais comum</li><li>A margem distal do supinador</li></ul>"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Sintoma</strong>",
              "Dor",
              "Fraqueza"
            ],
            [
              "<strong>Fraqueza</strong>",
              "<strong>Nenhuma</strong>",
              "<strong>Queda dos dedos e do polegar</strong>"
            ],
            [
              "<strong>Perda sensitiva</strong>",
              "Nenhuma",
              "Nenhuma (o NIP é puramente motor)"
            ],
            [
              "<strong>Extensão do punho</strong>",
              "Normal",
              "Presente, mas com <strong>desvio radial</strong> — o ECRL é poupado"
            ],
            [
              "<strong>Sensibilidade dolorosa à palpação</strong>",
              "<strong>3–5 cm distalmente</strong> ao epicôndilo lateral, sobre o supinador",
              "Variável"
            ],
            [
              "<strong>EMG</strong>",
              "Frequentemente normal",
              "Denervação nos músculos inervados pelo NIP"
            ]
          ],
          "columns": [
            "",
            "<strong>Síndrome do túnel radial</strong>",
            "<strong>Síndrome do NIP</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>A regra mais útil sobre o nervo radial ao nível do cotovelo:</strong> o <strong>NIP é puramente motor</strong> e o <strong>ECRL é inervado acima dele</strong>. Assim, um doente com queda dos dedos, um punho que ainda estende (mas desvia para radial), e <strong>sensibilidade inteiramente normal</strong> tem uma lesão do NIP — não uma paralisia do nervo radial ao nível do sulco espiral, nem uma radiculopatia C7.<br><br>Acrescente o <strong>braquiorradial</strong> ao estudo com agulha: é radial mas <strong>proximal ao NIP</strong>, pelo que é normal na paralisia do NIP e anormal numa lesão do sulco espiral.",
          "color": "violet",
          "label": "EMG / eletrodiagnóstico"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "6.4 Nervos cutâneos em torno do cotovelo"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Cutâneo antebraquial lateral</strong>",
              "Ramo terminal do nervo <strong>musculocutâneo</strong>",
              "Antebraço lateral",
              "Emerge lateralmente ao tendão do bicípite — <strong>o nervo lesado na reparação do bicípite distal</strong> e em venopunções antecubitais mal sucedidas"
            ],
            [
              "<strong>Cutâneo antebraquial medial</strong>",
              "<strong>Fascículo medial (C8–T1)</strong>",
              "Antebraço medial",
              "O seu PANS está <strong>reduzido na plexopatia do tronco inferior e na verdadeira síndrome do desfiladeiro torácico (SDT) neurogénica</strong> — um estudo fundamental, porque é poupado na neuropatia cubital do cotovelo"
            ],
            [
              "<strong>Cutâneo antebraquial posterior</strong>",
              "Nervo radial, no braço",
              "Antebraço posterior",
              "Poupado nas lesões do NIP; afetado nas lesões radiais altas"
            ]
          ],
          "columns": [
            "<strong>Nervo</strong>",
            "<strong>Origem</strong>",
            "<strong>Território</strong>",
            "<strong>Relevância</strong>"
          ]
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "6.5 Resumo de localização"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Flexão do cotovelo</strong>",
              "Fraca",
              "Normal",
              "Braquiorradial fraco",
              "Normal"
            ],
            [
              "<strong>Extensão do cotovelo</strong>",
              "Normal",
              "<strong>Fraca</strong>",
              "<strong>Fraca</strong>",
              "Normal"
            ],
            [
              "<strong>Extensão do punho</strong>",
              "Fraca",
              "Fraca",
              "<strong>Fraca (queda)</strong>",
              "Presente, com <strong>desvio radial</strong>"
            ],
            [
              "<strong>Extensão dos dedos</strong>",
              "Normal",
              "Fraca",
              "Fraca",
              "<strong>Fraca</strong>"
            ],
            [
              "<strong>Perda sensitiva</strong>",
              "Polegar, antebraço lateral",
              "Dedo médio",
              "Espaço interdigital dorsal",
              "<strong>Nenhuma</strong>"
            ],
            [
              "<strong>Reflexo</strong>",
              "Braquiorradial, bicipital",
              "<strong>Tricipital</strong>",
              "O tricipital pode ser poupado",
              "Normal"
            ]
          ],
          "columns": [
            "",
            "<strong>Radiculopatia C6</strong>",
            "<strong>Radiculopatia C7</strong>",
            "<strong>Radial (sulco espiral)</strong>",
            "<strong>NIP</strong>"
          ]
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "7. Anatomia Vascular e a Fossa Cubital"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "7.1 Artéria braquial"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Desce até à fossa <strong>medialmente ao tendão do bicípite e lateralmente ao nervo mediano</strong>.</li><li>Divide-se, aproximadamente ao nível do <strong>colo do rádio</strong>, nas artérias <strong>radial</strong> e <strong>cubital</strong>.</li><li>É recoberta pela <strong>aponevrose bicipital</strong>, que a separa da veia cubital mediana — a razão anatómica pela qual a venopunção é habitualmente segura nesta zona.</li></ul>"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "7.2 A anastomose em torno do cotovelo"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Uma rica rede colateral permite que o membro sobreviva à oclusão da artéria braquial. Combina ramos <strong>colaterais</strong>, provenientes de cima, com ramos <strong>recorrentes</strong>, provenientes de baixo.</li></ul>"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Medial</strong>",
              "Colateral cubital superior e inferior",
              "Recorrente cubital anterior e posterior"
            ],
            [
              "<strong>Lateral</strong>",
              "Colateral radial (da artéria braquial profunda)",
              "Recorrente radial"
            ],
            [
              "<strong>Posterior</strong>",
              "Colateral média (da artéria braquial profunda)",
              "Recorrente interóssea"
            ]
          ],
          "columns": [
            "<strong>Lado</strong>",
            "<strong>De cima (colateral)</strong>",
            "<strong>De baixo (recorrente)</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>A fratura supracondiliana na criança é a ameaça clássica a esta artéria.</strong> O fragmento proximal deslocado pode lesar a artéria braquial e o nervo mediano.<br><br>Esteja atento à <strong>contratura isquémica de Volkmann</strong> — síndrome compartimental do antebraço que produz fibrose dos flexores profundos e uma garra fixa. O sinal mais precoce é a <strong>dor à extensão passiva dos dedos</strong>, não a ausência de pulso. Um pulso palpável <strong>não</strong> exclui síndrome compartimental.",
          "color": "red",
          "label": "Armadilha — não perder"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "7.3 A fossa cubital"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Superior (base)</strong>",
              "Linha imaginária entre os dois epicôndilos"
            ],
            [
              "<strong>Lateral</strong>",
              "Braquiorradial"
            ],
            [
              "<strong>Medial</strong>",
              "Pronador redondo"
            ],
            [
              "<strong>Pavimento</strong>",
              "Braquial e supinador"
            ],
            [
              "<strong>Teto</strong>",
              "Pele, fáscia superficial (com a veia cubital mediana), fáscia profunda, reforçada pela <strong>aponevrose bicipital</strong>"
            ]
          ],
          "columns": [
            "<strong>Limite</strong>",
            "<strong>Estrutura</strong>"
          ]
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Conteúdo, de lateral para medial:</strong> Nervo radial (sob o braquiorradial) · <strong>Tendão do Bicípite</strong> · <strong>Artéria Braquial</strong> · <strong>Nervo Mediano</strong>.</li></ul>"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>\"Really Need Beer To Be At My Nicest\"</strong> — <strong>R</strong>adial <strong>N</strong>erve (nervo radial), <strong>B</strong>iceps <strong>T</strong>endon (tendão do bicípite), <strong>B</strong>rachial <strong>A</strong>rtery (artéria braquial), <strong>M</strong>edian <strong>N</strong>erve (nervo mediano), de lateral para medial.<br><br>Mais simples ainda para os três elementos centrais: <strong>TAN</strong> — <strong>T</strong>endão, <strong>A</strong>rtéria, <strong>N</strong>ervo, de lateral para medial.",
          "color": "green",
          "label": "Ajuda mnemónica"
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "Revisão Rápida"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "8.1 Problemas comuns relacionados com a anatomia"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Epicondilalgia lateral</strong>",
              "Origem do ECRB",
              "Tendinopatia degenerativa, não inflamação → carregue o tendão, não o infiltre repetidamente"
            ],
            [
              "<strong>Epicondilalgia medial</strong>",
              "Origens do pronador redondo e do flexor radial do carpo",
              "O nervo cubital situa-se imediatamente posterior → examine-o sempre"
            ],
            [
              "<strong>Síndrome do túnel cubital</strong>",
              "Nervo cubital ao nível do ligamento de Osborne",
              "A flexão estreita e estira → tala noturna em extensão"
            ],
            [
              "<strong>Síndrome do túnel radial</strong>",
              "NIP sob a arcada de Frohse",
              "Dor 3–5 cm distalmente ao epicôndilo, sem fraqueza → o \"cotovelo de ténis que falhou\""
            ],
            [
              "<strong>Rotura distal do bicípite</strong>",
              "Tendão na tuberosidade radial",
              "Predomina a fraqueza da supinação → teste do gancho; nervo cutâneo antebraquial lateral em risco na reparação"
            ],
            [
              "<strong>Bursite olecraniana</strong>",
              "Bolsa subcutânea",
              "Extra-articular → tumefação com mobilidade preservada"
            ],
            [
              "<strong>Sobrecarga em extensão-valgo</strong>",
              "LCU + olecrânio posteromedial",
              "Lançadores: laxidão do LCU → impacto posteromedial e osteófitos"
            ],
            [
              "<strong>Rigidez pós-traumática</strong>",
              "Cápsula, braquial, fascículo posterior do LCU",
              "Uma só cápsula, braquial sobre a cápsula → perda global e elevado risco de OH"
            ]
          ],
          "columns": [
            "<strong>Apresentação</strong>",
            "<strong>Estrutura</strong>",
            "<strong>Explicação anatómica</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Ossificação heterotópica: o cotovelo é a articulação mais frequentemente afetada no membro superior</strong>, sobretudo após fratura-luxação, queimaduras, e em doentes com <strong>traumatismo cranioencefálico ou lesão medular</strong>.<br><br>Razão anatómica: o <strong>braquial situa-se diretamente sobre a cápsula anterior</strong>, pelo que o hematoma e a lesão muscular ficam encostados ao periósteo.<br><br>Implicações práticas: esteja atento a um <strong>patamar ou reversão dos ganhos de amplitude associado a um cotovelo quente, endurecido e doloroso</strong> nas primeiras semanas após a lesão; use <strong>mobilização ativa suave em vez de alongamento passivo forçado</strong>, que a provoca; e lembre-se de que a manipulação agressiva precoce é um fator precipitante reconhecido.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "8.2 Quinze pérolas"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Três articulações, uma cápsula</strong> — o derrame, a contratura e a infiltração afetam todas as três.</li><li><strong>O arco funcional é 30–130° com 50°/50° de rotação.</strong> Defina os objetivos pela função, não pela amplitude total.</li><li><strong>O cotovelo mantém-se a 70–80° porque é aí que o volume capsular é máximo</strong> — um sinal forte de derrame.</li><li><strong>Uma almofada adiposa posterior visível significa derrame e, em trauma, uma fratura oculta.</strong></li><li><strong>CRITOE:</strong> o epicôndilo medial ossifica antes da tróclea — um núcleo \"troclear\" sem epicôndilo medial é um fragmento avulsionado encarcerado.</li><li><strong>O fascículo anterior do LCU, do epicôndilo ao tubérculo sublime, é o principal contentor do valgo.</strong></li><li><strong>O LCUL é o principal contentor da instabilidade rotatória posterolateral</strong> — proteja-o de infiltrações profundas de corticoide na face lateral.</li><li><strong>A pronação protege o lado lateral; a supinação protege o lado medial</strong> ao reabilitar uma luxação.</li><li><strong>O braquial situa-se sobre a cápsula anterior</strong> — a razão pela qual o cotovelo é o ponto quente de ossificação heterotópica do membro superior.</li><li><strong>O braquiorradial é um flexor inervado pelo nervo radial</strong> — o músculo-chave para distinguir a radiculopatia C6 da neuropatia radial.</li><li><strong>O ECRL tem origem acima da origem extensora comum</strong> — poupado no cotovelo de ténis e na paralisia do NIP, pelo que o punho continua a estender-se mas desvia para radial.</li><li><strong>O NIP é puramente motor; a síndrome do túnel radial é dor pura.</strong> Fraqueza com sensibilidade normal localiza de imediato.</li><li><strong>O ramo cutâneo palmar separa a síndrome do pronador da síndrome do túnel cárpico</strong> — a dormência tenar aponta para proximal.</li><li><strong>O ramo cutâneo dorsal separa o túnel cubital do canal de Guyon</strong> — a dormência cubital dorsal aponta para o cotovelo.</li><li><strong>Verifique a relação de três pontos antes e depois de cada redução.</strong></li></ul>"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "8.3 Sinais de alarme"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Cotovelo quente, tumefacto, extremamente doloroso e imóvel</strong> → artrite séptica. Aspire antes de infiltrar com corticoide, sempre.</li><li><strong>Tumefação posterior flutuante com febre ou celulite</strong> → bursite olecraniana séptica.</li><li><strong>Dor à extensão passiva dos dedos após fratura supracondiliana</strong> → síndrome compartimental. Um pulso presente não a exclui.</li><li><strong>Perda progressiva de amplitude com um cotovelo quente e endurecido após trauma ou lesão cerebral</strong> → ossificação heterotópica.</li><li><strong>Dor intensa seguida de fraqueza em mosaico, muitas vezes predominantemente do NIA</strong> → amiotrofia nevrálgica, não uma neuropatia de compressão.</li><li><strong>Dor noturna, dor em repouso ou sintomas sistémicos com exame mecânico normal</strong> → peça imagem; considere infeção ou tumor.</li><li><strong>Neuropatia cubital de novo num adulto com cúbito valgo</strong> → paralisia cubital tardia; pergunte sobre fratura na infância.</li></ul>"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "Apenas anatomia. A biomecânica do cotovelo — o eixo de rotação, a carga em valgo no lançamento, a transmissão de forças e a cinemática da instabilidade — é tratada em separado."
        }
      }
    ]
  },
  {
    "slug": "elbow-anatomy-pt-br",
    "canonicalName": "Anatomia do Cotovelo (BR)",
    "blocks": [
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<strong>Um Capítulo Didático para Residentes e Especialistas em Medicina Física e Reabilitação</strong> — Edição para Residentes.<br><br>Apenas anatomia. A biomecânica é tratada separadamente."
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "1. Visão Geral"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageUrl": "/api/uploads/illustrations/aad94af2-0b38-4067-ba22-e9ae8ec3c6ae.png"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "O ombro direciona o braço. <strong>O cotovelo posiciona a mão no espaço e controla a distância entre a mão e o corpo.</strong> Toda consequência funcional da patologia do cotovelo decorre disso: um cotovelo rígido é incapacitante de uma forma que um punho rígido não é, porque o paciente deixa de conseguir levar a mão até o rosto, o períneo ou o chão."
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "1.1 Três articulações dentro de uma única cápsula"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "Este é o fato estrutural mais importante sobre o cotovelo, e a razão pela qual seus problemas se comportam da forma como se comportam. Três articulações compartilham <strong>uma única cavidade sinovial e uma única cápsula</strong>, de modo que um processo em qualquer uma delas — sangue, pus, sinovite, aderência — envolve as três."
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Umeroulnar</strong>",
              "Gínglimo (dobradiça)",
              "Tróclea ↔ incisura troclear da ulna",
              "Flexão/extensão; <strong>o principal estabilizador ósseo</strong>"
            ],
            [
              "<strong>Umerorradial</strong>",
              "Esferoide modificada (bola e soquete)",
              "Capítulo ↔ cabeça do rádio",
              "Flexão/extensão + rotação; transmite ~60% da carga axial"
            ],
            [
              "<strong>Radioulnar proximal</strong>",
              "Trocóide (pivô)",
              "Cabeça do rádio ↔ incisura radial da ulna, no interior do ligamento anular",
              "Pronação/supinação"
            ]
          ],
          "columns": [
            "<strong>Articulação</strong>",
            "<strong>Tipo</strong>",
            "<strong>Entre</strong>",
            "<strong>Função</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Uma cápsula = três consequências que você vai encontrar semanalmente.</strong><br><br>1. Uma <strong>hemartrose ou derrame articular</strong> distende toda a articulação, de modo que o paciente perde flexão, extensão e rotação ao mesmo tempo.<br><br>2. A <strong>contratura capsular pós-traumática afeta as três</strong> — razão pela qual a rigidez pós-traumática do cotovelo é tão global e tão difícil de tratar.<br><br>3. Uma <strong>única injeção intra-articular</strong> alcança as três articulações. Não há necessidade de direcioná-las separadamente.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "1.2 Amplitude de movimento — total e funcional"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "67bc11b4-e1f0-4e23-aadb-b97aeb3c6d28",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/973ac19d-f914-4a7d-b890-9fb8e3632d97.png",
              "imageFit": "contain"
            },
            {
              "id": "f8276dd4-eb59-4ed2-9cf2-f3b67339d8c7",
              "label": ""
            }
          ]
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Flexão – extensão</strong>",
              "0–140° (até 10° de hiperextensão em casos de frouxidão ligamentar)",
              "<strong>30–130°</strong>"
            ],
            [
              "<strong>Pronação</strong>",
              "80-90º",
              "<strong>50°</strong>"
            ],
            [
              "<strong>Supinação</strong>",
              "80–90°",
              "<strong>50°</strong>"
            ]
          ],
          "columns": [
            "<strong>Movimento</strong>",
            "<strong>Amplitude total</strong>",
            "<strong>Arco funcional (Morrey)</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Use o arco funcional, não a amplitude total, para definir as metas de reabilitação.</strong> Um paciente que atinge 30–130° de flexão com 50° de pronação e supinação consegue realizar quase todas as atividades de vida diária. Perseguir os últimos 20° de extensão em um cotovelo rígido pós-traumático frequentemente custa mais em dor, inflamação e risco de ossificação heterotópica do que retorna em função.<br><br>A exceção é a <strong>perda de extensão em alguém que precisa de alcance</strong> (usuários de muletas ou cadeira de rodas, trabalhadores manuais) e a <strong>perda de flexão em qualquer paciente</strong>, porque é a flexão que leva a mão até o rosto.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "1.3 O ângulo de carregamento"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Com o cotovelo <strong>totalmente estendido e supinado</strong>, o antebraço se desvia lateralmente em relação ao eixo do braço: essa inclinação em valgo é o <strong>ângulo de carregamento</strong>.</li><li>Normal: aproximadamente <strong>11–14° nos homens e 13–16° nas mulheres</strong> (são citadas faixas de 5–20°). Ele existe para que o antebraço, ao oscilar, não esbarre na pelve.</li><li><strong>Diminui progressivamente com a flexão</strong> e desaparece (ou se inverte para um leve varo) na flexão completa. Meça-o sempre em extensão completa com a palma voltada para frente, ou o valor perde o sentido.</li><li>O <strong>cúbito valgo</strong> (ângulo aumentado) decorre mais frequentemente de consolidação viciosa ou parada de crescimento do côndilo lateral — e é a causa clássica da <strong>paralisia ulnar tardia</strong>, que surge anos após a lesão na infância.</li><li>O <strong>cúbito varo</strong> (\"deformidade em coronha de fuzil\") decorre de fratura supracondiliana consolidada viciosamente. É em grande parte estético, mas associado a instabilidade rotatória posterolateral tardia.</li></ul>"
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "2. Osteologia"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "0a0b3bff-d1f9-475f-8ec5-ef75641fbb06",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/f0287290-86ed-4f00-a0ba-d0b6d0b6fcf8.png",
              "imageFit": "contain"
            },
            {
              "id": "56d09677-e78c-406a-9586-28f37dcb59a6",
              "label": ""
            }
          ]
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "2.1 Úmero distal"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "2.1.1 O conceito das duas colunas"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>O úmero distal é mais bem visualizado como um <strong>triângulo</strong>:&nbsp;</li><ul><li><strong>coluna medial</strong></li><li><strong>coluna lateral</strong>&nbsp;</li><li><strong>superfície articular (tróclea + capítulo)</strong>, suspensa entre elas como o travessão.</li></ul></ul><br><ul><li>Isso explica os padrões de fratura e a estratégia de fixação, e explica por que o úmero distal é relativamente delgado entre as fossas — há osso nas bordas, não no centro.</li></ul>"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/feb57bb7-993c-4770-beb3-d315869bbe2a.png",
          "imageWidth": "3/4"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "2.1.2 Superfícies articulares"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Tróclea</strong> — a superfície medial, em forma de carretel, que se articula com a ulna. Possui um sulco profundo e cobre cerca de 300° de arco, conferindo à articulação umeroulnar sua estabilidade intrínseca.</li><li><strong>Capítulo</strong> — a superfície lateral, quase esférica, que se articula com a cabeça do rádio. Cobre apenas a metade <strong>anterior</strong> do côndilo lateral, razão pela qual a cabeça do rádio só se articula com ele em flexão, e pela qual as lesões do capítulo (osteocondrite dissecante) se manifestam com sintomas relacionados à flexão.</li><li><strong>Orientação:</strong>&nbsp;</li><ul><li>o bloco articular é rodado cerca de <strong>30° anteriormente</strong> em relação à diáfise umeral</li><li>inclinado cerca de <strong>6° em valgo</strong></li><li><span class=\"font-bold\">rodado internamente cerca de <strong>5</strong></span><strong>°</strong></li><li>A perda dessa inclinação anterior após uma fratura supracondiliana consolidada viciosamente bloqueia a flexão mecanicamente — nenhuma quantidade de terapia irá restaurá-la.</li></ul></ul>"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "2.1.3 Fossas"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Fossa coronoide</strong> (anteromedial) — recebe o processo coronoide na flexão completa.</li><li><strong>Fossa radial</strong> (anterolateral) — recebe a cabeça do rádio na flexão completa.</li><li><strong>Fossa do olécrano</strong> (posterior) — recebe o olécrano na extensão completa, e é onde o <strong>coxim adiposo posterior</strong> permanece oculto.</li></ul>"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "2.1.4 Epicôndilos"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Epicôndilo medial</strong> — maior, não articular, projetando-se posteromedialmente. Origem da <strong>massa flexopronadora comum</strong> e do <strong>ligamento colateral ulnar</strong>. O <strong>nervo ulnar percorre um sulco diretamente atrás dele</strong>.</li><li><strong>Epicôndilo lateral</strong> — menor. Origem da <strong>massa extensora comum</strong> e do <strong>complexo ligamentar colateral lateral</strong>.</li><li><strong>Cristas supracondilianas</strong> — a crista lateral dá origem ao <strong>braquiorradial e ao extensor radial longo do carpo</strong>, razão pela qual esses dois músculos não fazem parte da origem extensora comum e são poupados na epicondilalgia lateral.</li></ul>"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/f1260b78-a910-4bc1-b5a7-ab5a87950271.png",
          "imageWidth": "3/4"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/8fb37ad4-3920-4d8d-864f-631805a0da82.png",
          "imageWidth": "3/4"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/ef715896-8e8b-4a8d-a7ed-962fd72786d1.png",
          "imageWidth": "1/2"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "2.2 Ulna proximal"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<span></span>A ulna proximal forma uma sela profunda e altamente congruente com a tróclea umeral, atuando como estabilizador estático primário da articulação.<span>\n</span><b><br></b><ul><li><strong>Incisura troclear (grande incisura sigmóidea)</strong> — um gancho de ~190° que envolve a tróclea. É essa a origem da estabilidade óssea do cotovelo.</li><li><strong>Área desnuda transversa</strong> — uma faixa naturalmente desprovida de cartilagem que atravessa a porção média da incisura troclear, separando as facetas articulares do olécrano e do coronoide. <strong>Normal. Não relate como defeito condral.</strong></li><li><strong>Olécrano</strong> — a projeção posterior subcutânea; inserção do <strong>tríceps</strong>. Sua ponta entra na fossa do olécrano em extensão.</li><li><strong>Processo coronoide</strong> — o contraforte anterior. É o principal bloqueio à subluxação posterior; a deficiência do coronoide desestabiliza o cotovelo de forma desproporcional ao tamanho do fragmento.</li><li><strong>Tubérculo sublime</strong> — no coronoide medial: <strong>a inserção do feixe anterior do LCU</strong>. Memorize esse nome; ele aparece em todo relatório sobre cotovelo do arremessador.</li><li><strong>Incisura radial (pequena incisura sigmóidea)</strong> — lateral, articulando-se com a cabeça do rádio.</li><li><strong>Crista do supinador</strong> — estendendo-se distalmente a partir da incisura radial: <strong>a inserção do ligamento colateral ulnar lateral</strong>.</li></ul>"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/f602a3dd-bdcb-46a5-8139-87a13a8694ed.png"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "2.3 Rádio proximal"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "8794b9fe-3703-4bab-a881-bda9cc51a491",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/3366de96-fb08-4cdf-90d9-9cefeb52d87b.png",
              "imageFit": "contain"
            },
            {
              "id": "8bafed7a-1102-4bda-bec1-cdd6b34cdc0d",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/476433a0-7441-4bd4-89c5-51d5c46c84c3.png",
              "imageFit": "contain"
            },
            {
              "id": "fe15e347-25bf-4bc9-8b0a-3a2e5ed67b1d",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/d219e8d1-2019-49ef-9432-f4d44d434a05.png"
            }
          ]
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<span></span>A cabeça do rádio atua como um importante estabilizador estático secundário da articulação do cotovelo.<span></span><b><br></b><ul><li><strong>Cabeça do rádio</strong> — em forma de disco, com uma cúpula côncava para o capítulo. É <strong>elíptica, não circular</strong>, razão pela qual deve ser corretamente alinhada quando substituída ou fixada.</li><ul><li class=\"\" data-start-index=\"3142\"><span><span class=\"underline\">Cobertura articular</span>: <span class=\"font-bold\">A cartilagem hialina recobre</span> a cúpula articular proximal côncava (que se articula com o capítulo) e se estende por um arco de aproximadamente<span class=\"font-bold\"> 240° ao longo da borda externa </span>(que se articula com a pequena incisura sigmóidea da ulna).</span></li><li class=\"\" data-start-index=\"3142\"><span><span class=\"underline\">Zona segura cirúrgica</span>: O <span class=\"font-bold\">arco remanescente de 120° da borda não é </span><span class=\"font-bold\">recoberto por cartilagem</span> e é utilizado pelos cirurgiões para posicionar material de síntese durante a redução e fixação interna de fraturas desviadas da cabeça do rádio.</span></li></ul><li><strong>Colo do rádio</strong> — a constrição abaixo da cabeça, angulada discretamente para lateral.</li><li><strong>Tuberosidade radial (bicipital)</strong> — no colo anteromedial: <strong>inserção do tendão distal do bíceps</strong>.</li></ul><br>Funcionalmente, a cabeça do rádio é o <strong>estabilizador secundário mais importante ao valgo</strong>. Pode ser excisada em um cotovelo com o LCU íntegro, mas a excisão em um cotovelo com deficiência do LCU produz instabilidade grosseira."
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "2.4 Desenvolvimento Pediátrico e o Mnemônico CRITOE — Centros de ossificação"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<span></span>Na fisiatria pediátrica, o cotovelo é uma das regiões mais desafiadoras do ponto de vista diagnóstico devido ao <span class=\"font-bold\">surgimento não simultâneo de seis centros de ossificação secundários</span>. <br><br>Interpretar erroneamente essas estruturas em desenvolvimento como \"fragmentos\" é uma fonte frequente de <span class=\"font-bold\">erro iatrogênico</span>. <br>Dominar a sequência cronológica de aparecimento desses centros não é opcional para o médico assistente.<br><br><span></span>"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>C</strong>",
              "<span class=\"font-bold\">C</span>apítulo",
              "1"
            ],
            [
              "<strong>R</strong>",
              "<span class=\"font-bold\">R</span>ádio (cabeça)",
              "3"
            ],
            [
              "<strong>I</strong>",
              "<span class=\"font-bold\">I</span>nterno (epicôndilo medial)",
              "5"
            ],
            [
              "<strong>T</strong>",
              "<span class=\"font-bold\">T</span>róclea",
              "7"
            ],
            [
              "<strong>O</strong>",
              "<span class=\"font-bold\">O</span>lécrano",
              "9"
            ],
            [
              "<strong>E</strong>",
              "<span class=\"font-bold\">E</span>xterno (epicôndilo lateral)",
              "11"
            ]
          ],
          "columns": [
            "<strong>Ordem</strong>",
            "<strong>Centro</strong>",
            "<strong>Idade aproximada (anos)</strong>"
          ]
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>As idades são aproximadas e ocorrem <strong>1–2 anos mais cedo nas meninas</strong>. A <strong>ordem</strong> é confiável; as idades exatas não são.</li></ul>"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/0770a7ed-e245-4dc8-a406-a7c14251e12a.png",
          "imageWidth": "2/3"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<i data-start-index=\"2295\" class=\"\"></i>Lembre-se de que a ossificação no <span class=\"font-bold\">sexo feminino</span> tipicamente ocorre cerca de <span class=\"font-bold\">dois anos mais cedo</span> do que esses marcos padrão.<br><br>Para se proteger contra erros diagnósticos, utilizamos <span class=\"underline\"></span><span class=\"font-bold\">3 pilares diagnósticos</span><span class=\"underline\"></span>:<br><ul><li><span class=\"underline\">Regra da Ordem</span>: Os <span class=\"font-bold\">centros devem aparecer na sequência CRITOE</span>. Se a tróclea estiver visível mas o epicôndilo medial estiver ausente, deve-se suspeitar de avulsão ou luxação.</li><li><span class=\"underline\">Regra da Idade</span>: Se uma estrutura semelhante a um centro de ossificação <span class=\"font-bold\">aparecer anos antes de sua janela cronológica</span> (por exemplo, um \"olécrano\" aos 5 anos de idade), isso é <span class=\"font-bold\">patognomônico de um fragmento de fratura</span>.</li><li><span class=\"underline\">Morfologia</span>: Os centros de ossificação verdadeiros são <span class=\"font-bold\">lisos, arredondados e tipicamente simétricos</span> em relação ao membro contralateral. As fraturas se caracterizam por bordas irregulares, angulosas e não congruentes.</li></ul><br><span></span>A aplicação mais útil do CRITOE →&nbsp;<span class=\"font-bold\">O <span>epicôndilo medial sempre ossifica antes da tróclea</span>.</span><ul><li>Portanto, se você observa um centro de ossificação na região da tróclea mas <span>sem o epicôndilo medial</span>, o fragmento \"troclear\" é, na verdade, um <span>epicôndilo medial avulsionado</span> — frequentemente encarcerado dentro da articulação após uma luxação que se reduziu espontaneamente.</li><li>Isso torna necessário o axioma pediátrico fundamental: <span class=\"font-bold\"><span class=\"italic\">\"Epicôndilo medial ausente = procure dentro da articulação.\"</span></span></li></ul><span data-start-index=\"3293\" class=\"\"></span>",
          "label": "Ponto-chave"
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "3. Cápsula Articular, Coxins Adiposos e Bursas"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "3.1 Cápsula"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "aa9e8e34-d1c1-4d1c-8ed3-0f7fe895bd31",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/5ed674b8-68e4-4f85-a38c-8defb885cee4.png",
              "imageFit": "contain"
            },
            {
              "id": "7b91e183-9f19-4716-a988-eabf1d6c0617",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/3dca7b04-5d0f-4773-a9dd-13ba57f700c1.png",
              "imageFit": "contain"
            },
            {
              "id": "589f2777-f1ef-4ecc-8be4-0708a5b72607",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/f3f0ad7f-b511-4bc1-b088-b9416d94ff61.png"
            }
          ]
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Uma única cápsula envolve as três articulações. Fixa-se proximalmente acima das fossas coronoide e radial anteriormente e acima da fossa do olécrano posteriormente, e distalmente ao coronoide, ao ligamento anular e ao olécrano.</li><li>É <strong>fina e frágil anterior e posteriormente</strong> (onde permite o movimento) e <strong>espessada medial e lateralmente</strong>, formando os ligamentos colaterais (onde confere estabilidade).</li><li>A capacidade normal é de aproximadamente <strong>25–30 mL</strong>.</li><li><strong>A capacidade é máxima por volta de 70–80° de flexão.</strong></li></ul>"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Por que o paciente mantém o cotovelo a 70–80°?</strong>&nbsp;<br>Porque é nesse ponto que o volume capsular é máximo, correspondendo à posição de menor pressão intra-articular e menor dor quando a articulação está distendida. Um paciente sentado com o cotovelo mantido a cerca de 80° e que se recusa a movimentá-lo tem <strong>derrame articular até prova em contrário</strong> — sangue, pus ou sinovite.<br><br>O mesmo fato tem duas aplicações práticas: <br><ul><li>é a <strong>posição de conforto para imobilização de um cotovelo agudamente inflamado</strong>,&nbsp;</li><li>é a <strong>posição de maior rendimento para aspiração</strong>.</li></ul><br>É também um alerta. Imobilizar um cotovelo nessa posição confortável de meia-flexão é exatamente como se cria uma <strong>contratura em flexão</strong>. Imobilize na fase aguda por conforto, e depois mobilize precocemente.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "3.2 Coxins adiposos"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "205ba01f-d015-4926-901a-81973e7ca74b",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/912ac264-fb37-4dc2-bd7b-50b26f4da542.png",
              "imageFit": "contain"
            },
            {
              "id": "f5101b6f-848e-4808-9ac6-a5402f491bd5",
              "label": ""
            }
          ]
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "Existem 3 coxins adiposos localizados <strong>dentro da cápsula, mas fora da sinóvia</strong> (intracapsulares, extrassinoviais): anterior (coronoide + radial) e posterior (olécrano).<br><ul><li>O <strong>coxim adiposo anterior</strong> é normalmente visível em uma radiografia em perfil como uma fina lucência justaposta ao úmero.</li><li>O <strong>coxim adiposo posterior normalmente é invisível</strong>, pois se situa profundamente dentro da fossa do olécrano.</li></ul>"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Um coxim adiposo posterior visível em uma radiografia verdadeiramente em perfil, com 90° de flexão, indica derrame intra-articular — e, no contexto de trauma, uma fratura oculta até prova em contrário.</strong> Em adultos, pense em cabeça do rádio; em crianças, pense em fratura supracondiliana.<br><br>Um coxim adiposo anterior deslocado e elevado é o <strong>\"sinal da vela\"</strong>, com o mesmo significado.<br><br>Uma radiografia de aspecto normal com sinal do coxim adiposo positivo <strong>não é um cotovelo normal</strong>. Trate como fratura, imobilize e reavalie com nova imagem.",
          "color": "red",
          "label": "Armadilha — não passe despercebido"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "3.3 Bursas"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "bb73a723-5db3-4c56-991f-da266426edce",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/5a6704d4-f3a6-4539-a088-7225a0841f84.png"
            },
            {
              "id": "4e274d8b-5380-4ea1-9042-d6896d417eb5",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/eecfbbba-2478-45ef-a931-f6437ee3e131.png"
            },
            {
              "id": "70f63dfc-02df-4544-a88e-139b06ebe4db",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/5ec1a4c9-17e7-4656-bf36-1a4a7e248e77.png"
            }
          ]
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Olecraniana (subcutânea)</strong>",
              "Entre a pele e o olécrano, superficialmente à inserção do tríceps",
              "A bursite mais comum do corpo. Traumática, inflamatória (gota, AR) ou <strong>séptica</strong> — e sua posição superficial torna a infecção comum. <strong>Extra-articular</strong>, de modo que uma bursa edemaciada com movimento livre do cotovelo é bursite, não artrite"
            ],
            [
              "<strong>Bicipitorradial</strong>",
              "Entre o tendão distal do bíceps e a tuberosidade radial",
              "Inflama-se com a supinação repetitiva; causa de dor anterior no cotovelo e, ocasionalmente, de irritação do nervo interósseo posterior (NIP)"
            ],
            [
              "<strong>Interóssea (cubital)</strong>",
              "Entre o tendão do bíceps e a ulna",
              "Incomum"
            ]
          ],
          "columns": [
            "<strong>Bursa</strong>",
            "<strong>Localização</strong>",
            "<strong>Relevância clínica</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Diferenciando bursite olecraniana de artrite do cotovelo à beira do leito:</strong> <br><ul><li>A bursite produz um edema posterior bem demarcado e flutuante, com <strong>amplitude de movimento passiva quase completa</strong>.&nbsp;</li><li>A artrite ou o derrame produzem um cotovelo difusamente edemaciado, mantido a 70–80°, com <strong>movimento doloroso e restrito em todos os planos</strong>.</li></ul><br><strong>Aspire pelo lado lateral, nunca diretamente através do ápice posterior</strong> — a pele posterior é fina, pouco vascularizada e recebe carga ao se apoiar no cotovelo, de modo que uma punção posterior facilmente evolui para um trajeto fistuloso crônico.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "4. Ligamentos e Estabilidade"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "4.1 Complexo ligamentar colateral medial (ulnar)"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "Um complexo triangular de três partes, das quais <strong>apenas uma realmente importa clinicamente</strong>."
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Feixe anterior</strong>",
              "Epicôndilo medial anteroinferior → <strong>tubérculo sublime</strong> do coronoide",
              "Ao longo de <strong>20–120°</strong>; suas bandas anterior e posterior se tensionam reciprocamente, de modo que alguma parte está sempre tensa",
              "<strong>O principal freio ao valgo.</strong> A estrutura lesada nos arremessadores e reconstruída na cirurgia de \"Tommy John\""
            ],
            [
              "<strong>Feixe posterior</strong><strong> (de Bardinet)</strong>",
              "Epicôndilo medial → margem medial do olécrano; em formato de leque",
              "Além de <strong>90°</strong> de flexão",
              "Secundário. <strong>A contratura aqui é uma causa importante de contratura em flexão pós-traumática</strong>"
            ],
            [
              "<strong>Ligamento transverso (de Cooper)</strong>",
              "Olécrano → coronoide, ou seja, de ulna para ulna",
              "—",
              "Não cruza nenhuma articulação. Não contribui praticamente em nada para a estabilidade"
            ]
          ],
          "columns": [
            "<strong>Componente</strong>",
            "<strong>Trajeto</strong>",
            "<strong>Tenso quando</strong>",
            "<strong>Importância</strong>"
          ]
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/38fefb17-8cf2-47e1-8529-a56f90dc8e6c.png"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "Como o feixe anterior se origina <strong>posteriormente ao eixo de rotação</strong>, ele se tensiona à medida que o cotovelo flexiona. Essa é a base anatômica do <strong>teste de estresse em valgo dinâmico (moving valgus stress test)</strong>: dor reproduzida aproximadamente entre 70° e 120° enquanto o cotovelo é movimentado sob uma carga constante em valgo.<br><br>A <strong>apófise do epicôndilo medial é mais frágil do que o ligamento em um atleta esqueleticamente imaturo</strong>. Assim, a mesma sobrecarga em valgo que rompe o LCU em um adulto produz <strong>apofisite do epicôndilo medial (\"cotovelo da liga infantil\")</strong> em uma criança. Mesmo mecanismo, ponto de falha diferente — e conduta completamente diferente.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "4.2 Complexo ligamentar colateral lateral"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Ligamento colateral ulnar lateral (LCUL)</strong>",
              "Epicôndilo lateral → <strong>crista do supinador</strong> da ulna, passando superficialmente ao ligamento anular",
              "<strong>Principal freio à instabilidade rotatória posterolateral (IRPL).</strong> A estrutura lateral crítica"
            ],
            [
              "<strong>Ligamento colateral radial</strong>",
              "Epicôndilo lateral → funde-se ao ligamento anular",
              "Praticamente <strong>isométrico</strong> ao longo de todo o arco; resiste ao varo"
            ],
            [
              "<strong>Ligamento anular</strong>",
              "Envolve a cabeça do rádio, fixando-se às margens anterior e posterior da incisura radial da ulna",
              "Mantém a cabeça do rádio contra a ulna. <strong>Em formato de funil, mais estreito distalmente</strong> — razão pela qual a cabeça permanece contida"
            ],
            [
              "<strong>LCL acessório</strong>",
              "Ligamento anular → crista do supinador",
              "Estabiliza o ligamento anular durante o estresse em varo"
            ]
          ],
          "columns": [
            "<strong>Componente</strong>",
            "<strong>Trajeto</strong>",
            "<strong>Função</strong>"
          ]
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/0c8df9ba-f440-47d6-9cb5-40bacee5e6c3.png"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Por que o LCUL importa para o fisiatra?</strong>&nbsp;<br>É a estrutura cuja falha produz <strong>instabilidade rotatória posterolateral</strong> — um paciente que descreve estalos, ressaltos ou apreensão ao se levantar de uma cadeira com o antebraço supinado.<br><br><span class=\"underline\">Duas causas</span> que você deve conhecer: <br><ol><li>após uma <strong>luxação do cotovelo</strong></li><li><strong>iatrogênica</strong> — decorrente de cirurgia excessivamente agressiva ou de infiltrações repetidas e profundas de corticoide para epicondilalgia lateral. Teste com o <strong>chair push-up test</strong>, o <strong>tabletop relocation test</strong>, ou o pivot-shift lateral.</li></ol><br>Essa é uma razão clínica direta para manter as infiltrações de corticoide no cotovelo de tenista superficiais, pouco frequentes e, idealmente, para preferir outras opções.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "4.2.1 O ligamento anular e a pronação dolorosa do cotovelo (\"cotovelo de babá\")"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Em uma criança com menos de cerca de 5 anos, a cabeça do rádio ainda não está totalmente formada e o ligamento anular é relativamente frouxo.</li><li>Uma <strong>tração axial súbita sobre o antebraço pronado e estendido</strong> permite que o ligamento anular deslize proximalmente sobre a cabeça do rádio e fique aprisionado na articulação radiocapitelar — o <strong>\"cotovelo puxado\"</strong>.</li><li>A criança mantém o braço <strong>pronado e discretamente fletido</strong>, recusa-se a usá-lo, e <strong>não apresenta edema nem dor localizada à palpação</strong>. As radiografias são normais.</li><li>A redução é feita por <strong>supinação com flexão</strong>, ou por <strong>hiperpronação</strong> (que apresenta uma taxa de sucesso na primeira tentativa discretamente maior).</li></ul>"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "4.3 Como o cotovelo se mantém estável"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "Um esquema que vale a pena memorizar, porque indica o que falhou após uma lesão."
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Estabilizadores primários</strong>",
              "<strong>Articulação umeroulnar</strong> (o gancho ósseo) · <strong>feixe anterior do LCU</strong> (valgo) · <strong>complexo LCL, especialmente o LCUL</strong> (varo e rotatório)"
            ],
            [
              "<strong>Estabilizadores secundários</strong>",
              "<strong>Cabeça do rádio</strong> (valgo) · <strong>origens flexora e extensora comuns</strong> (compressão dinâmica) · <strong>cápsula anterior</strong>"
            ],
            [
              "<strong>Estabilizadores dinâmicos</strong>",
              "Os músculos que cruzam a articulação — ancôneo, massa flexopronadora, tríceps"
            ]
          ],
          "columns": [
            "<strong>Nível</strong>",
            "<strong>Estruturas</strong>"
          ]
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "4.3.1 O círculo de Horii"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>A luxação do cotovelo não é um evento único, mas uma <strong>sequência</strong>, e as partes moles falham em uma ordem previsível <strong>de lateral para medial</strong> (O'Driscoll):</li><li><strong>Estágio 1</strong> — ruptura do LCUL → instabilidade rotatória posterolateral.</li><li><strong>Estágio 2</strong> — estruturas laterais remanescentes e cápsula anterior/posterior → luxação incompleta (\"empoleirada\").</li><li><strong>Estágio 3</strong> — o LCU falha por último → luxação completa.</li><li>A <strong>\"tríade terrível\"</strong> = luxação do cotovelo + <strong>fratura da cabeça do rádio</strong> + <strong>fratura do coronoide</strong>. Tanto os estabilizadores secundários quanto os primários estão perdidos, por isso é notoriamente instável e rígida.</li></ul>"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>A consequência para a reabilitação.</strong> Após uma luxação simples, o cotovelo costuma ser estável na porção média do arco e instável nos extremos. A mobilização <strong>ativa</strong> precoce dentro de um arco protegido, com o antebraço posicionado para proteger o lado lesado — <strong>a pronação protege o lado lateral (LCUL), a supinação protege o lado medial (LCU)</strong> — preserva o movimento sem risco de reluxação.<br><br>A imobilização prolongada é a inimiga: <strong>a rigidez do cotovelo é muito mais incapacitante e muito mais difícil de tratar do que uma frouxidão residual leve.</strong>",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "5. Músculos"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "5.1 Como organizá-los"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Braço anterior (flexores):</strong> bíceps braquial, braquial, braquiorradial.</li><li><strong>Braço posterior (extensores):</strong> tríceps braquial, ancôneo.</li><li><strong>Massa flexopronadora comum</strong>, a partir do epicôndilo <strong>medial</strong>.</li><li><strong>Massa extensora-supinadora comum</strong>, a partir do epicôndilo <strong>lateral</strong>.</li></ul>"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "As duas massas são imagens em espelho, e suas patologias também são imagens em espelho: <br><ul><li><strong>epicôndilo medial = flexores e pronadores = cotovelo de golfista</strong>;&nbsp;</li><li><strong>epicôndilo lateral = extensores e supinadores = cotovelo de tenista</strong>.</li></ul>",
          "color": "green",
          "label": "Mnemônico"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "5.2 Os flexores do cotovelo"
        }
      },
      {
        "block_type": "rich_table",
        "content_config": {
          "rows": [
            {
              "cells": [
                "<strong>Origem</strong>",
                "Cabeça longa: tubérculo supraglenoidal. Cabeça curta: processo coracoide"
              ]
            },
            {
              "cells": [
                "<strong>Inserção</strong>",
                "<strong>Tuberosidade radial (bicipital)</strong>, além da <strong>aponeurose bicipital (lacertus fibrosus)</strong>, na fáscia profunda do antebraço"
              ]
            },
            {
              "cells": [
                "<strong>Inervação</strong>",
                "<strong>Nervo musculocutâneo (C5, C6)</strong>"
              ]
            },
            {
              "cells": [
                "<strong>Ação</strong>",
                "O <strong>supinador mais potente</strong>, especialmente com o cotovelo fletido a 90°; um forte flexor do cotovelo quando o antebraço está supinado"
              ]
            },
            {
              "cells": [
                "<strong>Relevância clínica</strong>",
                "Por ser o principal supinador, a ruptura do bíceps distal custa <strong>~40–50% da força de supinação</strong>, mas apenas cerca de 30% da força de flexão. O <strong>hook test</strong> (ganchear um dedo sob o tendão a partir do lado lateral) é o teste à beira do leito mais confiável. O <strong>lacertus fibrosus</strong> pode permanecer íntegro e mascarar a retração — a ausência da deformidade de Popeye não exclui a ruptura"
              ]
            }
          ],
          "title": "Bíceps braquial",
          "columns": [
            {
              "type": "text",
              "title": "Campo"
            },
            {
              "type": "text",
              "title": "Detalhe"
            }
          ]
        }
      },
      {
        "block_type": "rich_table",
        "content_config": {
          "rows": [
            {
              "cells": [
                "<strong>Origem</strong>",
                "Metade distal da face anterior da diáfise umeral"
              ]
            },
            {
              "cells": [
                "<strong>Inserção</strong>",
                "<strong>Processo coronoide e tuberosidade da ulna</strong>"
              ]
            },
            {
              "cells": [
                "<strong>Inervação</strong>",
                "<strong>Musculocutâneo (C5, C6)</strong>, com a porção lateral suprida pelo <strong>nervo radial (C7)</strong>"
              ]
            },
            {
              "cells": [
                "<strong>Ação</strong>",
                "O <strong>flexor de trabalho do cotovelo</strong> — flexiona em qualquer posição do antebraço porque se insere na ulna, que não gira"
              ]
            },
            {
              "cells": [
                "<strong>Relevância clínica</strong>",
                "Situa-se <strong>diretamente sobre a cápsula anterior</strong>, sendo o músculo que sangra para dentro da cápsula após trauma do cotovelo e o local onde a <strong>ossificação heterotópica</strong> mais frequentemente se forma. Sua dupla inervação é uma curiosidade eletromiográfica que vale a pena conhecer: o braquial pode ser parcialmente poupado em uma lesão isolada do musculocutâneo"
              ]
            }
          ],
          "title": "Braquial",
          "columns": [
            {
              "type": "text",
              "title": "Campo"
            },
            {
              "type": "text",
              "title": "Detalhe"
            }
          ]
        }
      },
      {
        "block_type": "rich_table",
        "content_config": {
          "rows": [
            {
              "cells": [
                "<strong>Origem</strong>",
                "<strong>Crista supracondiliana lateral</strong> do úmero — não a origem extensora comum"
              ]
            },
            {
              "cells": [
                "<strong>Inserção</strong>",
                "Processo estiloide do rádio"
              ]
            },
            {
              "cells": [
                "<strong>Inervação</strong>",
                "<strong>Nervo radial (C5, C6)</strong>"
              ]
            },
            {
              "cells": [
                "<strong>Ação</strong>",
                "Flexiona o cotovelo, de forma mais eficaz com o antebraço em posição <strong>neutra</strong> (meio-prona); retorna o antebraço à posição neutra a partir de qualquer um dos extremos"
              ]
            },
            {
              "cells": [
                "<strong>Relevância clínica</strong>",
                "O clássico <strong>\"flexor suprido pelo nervo radial\"</strong>. Por ser C5–C6, mas radial, é um músculo-chave para diferenciar uma <strong>radiculopatia C6</strong> de uma <strong>neuropatia radial</strong>, e seu reflexo (reflexo braquiorradial) testa C6. Sua origem proximal ao epicôndilo faz com que seja poupado na epicondilalgia lateral"
              ]
            }
          ],
          "title": "Braquiorradial",
          "columns": [
            {
              "type": "text",
              "title": "Campo"
            },
            {
              "type": "text",
              "title": "Detalhe"
            }
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<span class=\"text-sm\"><span class=\"font-bold\">Os 3 B's flexionam o cotovelo:</span><br><ul><li><span><span><span><span class=\"font-bold\">B</span>íceps braquial</span></span></span></li><li><span><span><span class=\"font-bold\">B</span>raquial</span></span></li><li><span><span class=\"font-bold\">B</span>raquiorradial</span></li></ul></span>",
          "label": "Ponto-chave"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "5.3 Os extensores do cotovelo"
        }
      },
      {
        "block_type": "rich_table",
        "content_config": {
          "rows": [
            {
              "cells": [
                "<strong>Origem</strong>",
                "Cabeça longa: <strong>tubérculo infraglenoidal</strong> da escápula. Cabeça lateral: face posterior do úmero, acima do sulco espiral. Cabeça medial: face posterior do úmero, abaixo do sulco"
              ]
            },
            {
              "cells": [
                "<strong>Inserção</strong>",
                "Olécrano, por meio de um tendão amplo; algumas fibras continuam na fáscia antebraquial"
              ]
            },
            {
              "cells": [
                "<strong>Inervação</strong>",
                "<strong>Nervo radial (C6, C7, C8)</strong> — com predomínio de C7"
              ]
            },
            {
              "cells": [
                "<strong>Ação</strong>",
                "O principal extensor do cotovelo. A cabeça longa também estende e aduz o ombro"
              ]
            },
            {
              "cells": [
                "<strong>Relevância clínica</strong>",
                "A fraqueza do tríceps é incapacitante para quem <strong>faz transferências, usa muletas ou impulsiona uma cadeira de rodas</strong> — avalie-o explicitamente em todo paciente com lesão medular ou AVC. O <strong>reflexo tricipital testa C7</strong>. Uma <strong>cabeça medial que se desloca em ressalto sobre o epicôndilo</strong> pode causar sintomas do nervo ulnar e mimetizar a síndrome do túnel cubital"
              ]
            }
          ],
          "title": "Tríceps braquial",
          "columns": [
            {
              "type": "text",
              "title": "Campo"
            },
            {
              "type": "text",
              "title": "Detalhe"
            }
          ]
        }
      },
      {
        "block_type": "rich_table",
        "content_config": {
          "rows": [
            {
              "cells": [
                "<strong>Origem</strong>",
                "Face posterior do <strong>epicôndilo lateral</strong>"
              ]
            },
            {
              "cells": [
                "<strong>Inserção</strong>",
                "Face lateral do olécrano e face posterior proximal da ulna"
              ]
            },
            {
              "cells": [
                "<strong>Inervação</strong>",
                "<strong>Nervo radial (C7, C8)</strong>, através do ramo para a cabeça medial do tríceps"
              ]
            },
            {
              "cells": [
                "<strong>Ação</strong>",
                "Auxilia a extensão; <strong>estabiliza o cotovelo contra forças de varo e rotatórias posterolaterais</strong> e estabiliza a ulna durante a pronação"
              ]
            },
            {
              "cells": [
                "<strong>Relevância clínica</strong>",
                "Pequeno, mas útil: é um <strong>estabilizador posterolateral dinâmico</strong>, e o <strong>intervalo de Kocher</strong> entre o ancôneo e o extensor ulnar do carpo é a via de acesso cirúrgica lateral padrão. A denervação nesse músculo pode ser observada na neuropatia radial"
              ]
            }
          ],
          "title": "Ancôneo",
          "columns": [
            {
              "type": "text",
              "title": "Campo"
            },
            {
              "type": "text",
              "title": "Detalhe"
            }
          ]
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "5.4 Massa flexopronadora comum (epicôndilo medial)"
        }
      },
      {
        "block_type": "image_row",
        "content_config": {
          "images": [
            {
              "id": "e6531000-28ed-4fa7-8b1c-e499a37d2954",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/65f38ccc-fb74-4a5f-9ade-d81d1a198fd7.png"
            },
            {
              "id": "bd8aa816-93bd-4816-94f5-ec420be39588",
              "label": "",
              "assetUrl": "/api/uploads/illustrations/73104ed9-112f-449a-a00e-757ddb1bbfac.png"
            }
          ]
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "Cinco músculos, memorizados <strong>de radial para ulnar</strong>, na ordem em que se dispõem:"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Pronador redondo</strong>",
              "Mediano",
              "C6, C7",
              "Pronação. <strong>Duas cabeças</strong> — o nervo mediano passa entre elas, o local mais comum da síndrome do pronador"
            ],
            [
              "<strong>Flexor radial do carpo</strong>",
              "Mediano",
              "C6, C7",
              "Flexão e desvio radial do punho"
            ],
            [
              "<strong>Palmar longo</strong>",
              "Mediano",
              "C7–T1",
              "Ausente em ~15% das pessoas; doador de enxerto"
            ],
            [
              "<strong>Flexor superficial dos dedos</strong>",
              "Mediano",
              "C7–T1",
              "Flexão das interfalângicas proximais. Seu <strong>arco fibroso (sublimis bridge)</strong> é um local de compressão do nervo mediano"
            ],
            [
              "<strong>Flexor ulnar do carpo</strong>",
              "<strong>Ulnar</strong>",
              "C7–T1",
              "O <strong>único músculo da massa suprido pelo nervo ulnar</strong>. Suas <strong>duas cabeças formam o teto do túnel cubital</strong>"
            ]
          ],
          "columns": [
            "<strong>Músculo</strong>",
            "<strong>Nervo</strong>",
            "<strong>Raízes</strong>",
            "<strong>Ação / observação</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>A massa flexopronadora é um estabilizador dinâmico em valgo</strong>, situada diretamente sobre o LCU. Em um arremessador com dor medial no cotovelo, fortalecer essa massa é uma intervenção mecânica genuína, não um exercício genérico — ela alivia a carga sobre o ligamento.<br><br>A <strong>epicondilalgia medial (cotovelo de golfista)</strong> mais frequentemente envolve as <strong>origens do pronador redondo e do flexor radial do carpo</strong>. Como o <strong>nervo ulnar situa-se imediatamente posterior</strong>, 20–50% dos pacientes apresentam irritação concomitante do nervo ulnar. Examine sempre o nervo antes de rotular como \"apenas cotovelo de golfista\", e mantenha a agulha afastada do sulco ao infiltrar.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "5.5 Massa extensora-supinadora comum (epicôndilo lateral)"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Extensor radial longo do carpo</strong>",
              "<strong>Crista supracondiliana lateral</strong>",
              "Radial",
              "Acima da origem comum — poupado no cotovelo de tenista; <strong>poupado na paralisia do NIP</strong>, de modo que o punho ainda estende, porém com desvio radial"
            ],
            [
              "<strong>Extensor radial curto do carpo</strong>",
              "Origem extensora comum",
              "<strong>NIP</strong>",
              "<strong>O tendão da epicondilalgia lateral.</strong> Sua face profunda atrita contra o capítulo"
            ],
            [
              "<strong>Extensor comum dos dedos</strong>",
              "Origem extensora comum",
              "NIP",
              "Frequentemente envolvido junto com o extensor radial curto do carpo"
            ],
            [
              "<strong>Extensor do dedo mínimo</strong>",
              "Origem extensora comum",
              "NIP",
              ""
            ],
            [
              "<strong>Extensor ulnar do carpo</strong>",
              "Origem extensora comum",
              "NIP",
              "Junto com o ancôneo, forma o intervalo de Kocher"
            ],
            [
              "<strong>Supinador</strong>",
              "Epicôndilo lateral, LCL, lig. anular, crista do supinador",
              "<strong>NIP</strong>",
              "O <strong>NIP o atravessa por baixo da arcada de Frohse</strong> — o local clássico de encarceramento"
            ]
          ],
          "columns": [
            "<strong>Músculo</strong>",
            "<strong>Origem</strong>",
            "<strong>Nervo</strong>",
            "<strong>Observação</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>A epicondilalgia lateral é uma tendinopatia do extensor radial curto do carpo, não uma inflamação.</strong> A histologia mostra degeneração angiofibroblástica com pouco ou nenhum infiltrado inflamatório — razão exata pela qual o corticoide proporciona alívio a curto prazo, mas piores desfechos em um ano do que não fazer nada, e pela qual a <strong>sobrecarga progressiva é o tratamento baseado em evidências</strong>.<br><br>Palpe <strong>logo distal e anterior ao epicôndilo lateral</strong> — a origem do extensor radial curto do carpo — não a ponta do epicôndilo propriamente dita.<br><br><strong>Sempre exclua a síndrome do túnel radial</strong>, que se situa 3–5 cm distalmente, sobre o supinador, e causa dor sem fraqueza. As duas coexistem em talvez 5–10% dos casos resistentes, e um \"cotovelo de tenista refratário\" frequentemente é um túnel radial não diagnosticado.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "5.6 Os pronadores e supinadores"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Supinador</strong>",
              "NIP (C6)",
              "Supina com o cotovelo <strong>estendido</strong>; atua sozinho na supinação lenta e sem resistência"
            ],
            [
              "<strong>Bíceps braquial</strong>",
              "Musculocutâneo (C5–C6)",
              "O supinador potente; recrutado para a supinação <strong>resistida</strong>, com desempenho ótimo a 90° de flexão"
            ],
            [
              "<strong>Pronador redondo</strong>",
              "Mediano (C6–C7)",
              "Pronação rápida e potente"
            ],
            [
              "<strong>Pronador quadrado</strong>",
              "<strong>Interósseo anterior</strong> (C7–T1)",
              "O <strong>principal pronador</strong>; atua sozinho na pronação lenta e sem resistência"
            ]
          ],
          "columns": [
            "<strong>Músculo</strong>",
            "<strong>Nervo</strong>",
            "<strong>Observação</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "Os rotadores <strong>lentos e discretos</strong> são os músculos profundos monoarticulares (<strong>supinador</strong> e <strong>pronador quadrado</strong>). Os <strong>rápidos e potentes</strong> são os grandes músculos biarticulares (<strong>bíceps</strong> e <strong>pronador redondo</strong>). Teste a força de rotação com o cotovelo a 90° para eliminar a substituição pelo ombro.",
          "color": "green",
          "label": "Mnemônico"
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "6. Neuroanatomia"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "O cotovelo é o segundo local mais comum de encarceramento de nervo periférico no corpo, depois do punho. Três nervos o atravessam, cada um por uma sequência previsível de túneis. <strong>Aprenda os túneis em ordem e a localização se torna aritmética.</strong>"
        }
      },
      {
        "block_type": "simple_image",
        "content_config": {
          "caption": "Figura 3 — Locais de compressão dos três nervos que cruzam o cotovelo, de proximal para distal.",
          "imageFit": "original",
          "imageUrl": "/api/uploads/illustrations/26e279df-4259-44e9-907d-6fa9883d4970.png",
          "imageWidth": "full"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "6.1 Nervo mediano"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "6.1.1 Trajeto"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Desce pelo braço <strong>medialmente à artéria braquial</strong>, cruza a fossa cubital <strong>medialmente à artéria e ao tendão do bíceps</strong>.</li><li>Passa <strong>sob o lacertus fibrosus</strong>, depois <strong>entre as duas cabeças do pronador redondo</strong>, depois <strong>sob o arco fibroso do flexor superficial dos dedos</strong>, e continua no antebraço.</li><li>O <strong>nervo interósseo anterior (NIA)</strong> se ramifica cerca de <strong>5–8 cm distalmente aos epicôndilos</strong> e supre o <strong>flexor longo do polegar, a metade radial do flexor profundo dos dedos e o pronador quadrado</strong>.</li></ul>"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "6.1.2 Síndromes compressivas"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Ligamento de Struthers</strong>",
              "A partir de um <strong>processo supracondiliano</strong>, ~5 cm acima do epicôndilo medial (presente em ~1% das pessoas)",
              "Sintomas medianos; pode também comprimir a artéria braquial. Procure o esporão ósseo na radiografia"
            ],
            [
              "<strong>Síndrome do pronador</strong>",
              "Lacertus fibrosus, entre as duas cabeças do pronador redondo, ou o arco do flexor superficial dos dedos",
              "Dor em peso no antebraço, que piora com a pronação repetitiva. <strong>A perda sensitiva inclui a eminência tenar</strong>, porque o ramo cutâneo palmar está envolvido"
            ],
            [
              "<strong>Síndrome do NIA</strong>",
              "Bandas fibrosas, arco do flexor superficial dos dedos ou (frequentemente) <strong>amiotrofia neurálgica</strong>",
              "<strong>Puramente motora.</strong> Fraqueza do flexor longo do polegar e do flexor profundo do indicador → incapacidade de formar o sinal de \"OK\" arredondado; a pinça se torna achatada e quadrada. <strong>Nenhuma perda sensitiva</strong>"
            ]
          ],
          "columns": [
            "<strong>Síndrome</strong>",
            "<strong>Local</strong>",
            "<strong>Achados</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Síndrome do pronador versus síndrome do túnel do carpo — o discriminador é o ramo cutâneo palmar.</strong> Ele deixa o nervo mediano cerca de 5 cm proximalmente ao punho e passa <strong>por cima</strong> do retináculo flexor, de modo que é <strong>poupado na STC</strong>, mas <strong>envolvido na síndrome do pronador</strong>.<br><br>Portanto: dormência da <strong>própria eminência tenar</strong> aponta para uma lesão proximal; dormência restrita aos <strong>três dedos e meio radiais, com a pele da região tenar preservada</strong>, aponta para o túnel do carpo.<br><br><strong>Cuidado com o rótulo \"síndrome do NIA\".</strong> Uma grande proporção dos casos é, na verdade, <strong>síndrome de Parsonage–Turner</strong>, apresentando-se com um padrão predominantemente do NIA — precedida de dor intensa, e frequentemente com envolvimento sutil fora do território do NIA. Procure por ela antes de indicar descompressão cirúrgica.",
          "color": "violet",
          "label": "EMG / eletrodiagnóstico"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "6.2 Nervo ulnar"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "6.2.1 Trajeto"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Percorre o braço medialmente, <strong>perfura o septo intermuscular medial</strong> aproximadamente no meio do braço para entrar no compartimento posterior.</li><li>Passa <strong>atrás do epicôndilo medial, no sulco retrocondilar</strong>, onde é subcutâneo e diretamente palpável.</li><li>Entra no <strong>túnel cubital</strong>, cujo teto é formado pelo <strong>ligamento de Osborne (retináculo do túnel cubital)</strong>, entre as duas cabeças do flexor ulnar do carpo.</li><li>Não emite ramos no braço; no antebraço, supre o <strong>flexor ulnar do carpo e a metade ulnar do flexor profundo dos dedos</strong>.</li><li>O <strong>ramo cutâneo dorsal</strong> origina-se <strong>5–8 cm proximalmente ao punho</strong>.</li></ul>"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "6.2.2 Por que a flexão piora o quadro"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>O túnel cubital <strong>não é um tubo rígido</strong>. Na flexão, o retináculo se tensiona, o túnel se achata e seu <strong>volume cai cerca de 50–55%</strong>.</li><li>Simultaneamente, o nervo <strong>se alonga cerca de 5 mm a cada 45° de flexão</strong>, de modo que é distendido e comprimido ao mesmo tempo.</li><li>A pressão intraneural aumenta várias vezes na flexão completa, e ainda mais com o ombro abduzido — a postura de sono que desperta esses pacientes.</li></ul>"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Essa anatomia é o tratamento.</strong> A intervenção de primeira linha para a síndrome do túnel cubital não é cirurgia nem medicação: é a <strong>imobilização noturna a 30–45° de extensão</strong>, associada à <strong>modificação de atividades para evitar a flexão sustentada</strong> (uso do telefone, dormir encolhido, apoiar-se sobre o cotovelo).<br><br>Explique o mecanismo ao paciente em uma frase — \"dobrar o cotovelo comprime e estica o nervo ao mesmo tempo\" — e a adesão melhora drasticamente.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>O ramo cutâneo dorsal localiza a lesão.</strong> Ele deixa o nervo ulnar bem proximalmente ao canal de Guyon, portanto:<br><br>Perda sensitiva no <strong>dorso da mão, no território ulnar = lesão no cotovelo/antebraço ou acima deles</strong> (túnel cubital).<br><br>Perda sensitiva restrita aos <strong>dedos ulnares na face palmar, com dorso normal = lesão no punho</strong> (canal de Guyon).<br><br><strong>A técnica importa.</strong> A condução nervosa através do cotovelo deve ser realizada com o cotovelo <strong>fletido a 70–90°</strong> e o segmento medido em <strong>10 cm</strong>; caso contrário, a folga do nervo em extensão produz uma distância falsamente curta e uma velocidade espuriamente lenta. Uma queda <strong>>10 m/s através do cotovelo</strong> ou um bloqueio de condução é o achado diagnóstico.<br><br>A <strong>anastomose de Martin–Gruber</strong> (cruzamento mediano-ulnar no antebraço, presente em ~15–20% das pessoas) pode simular um bloqueio de condução no cotovelo. Considere-a antes de relatar um bloqueio.",
          "color": "violet",
          "label": "EMG / eletrodiagnóstico"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "A <strong>subluxação do nervo ulnar</strong> sobre o epicôndilo medial durante a flexão ocorre em até ~20% das pessoas assintomáticas. Palpe-a dinamicamente antes de atribuir sintomas a ela — e registre-a antes de qualquer planejamento cirúrgico.<br><br>A <strong>paralisia ulnar tardia</strong> surge anos ou décadas após uma lesão do côndilo lateral na infância, com <strong>cúbito valgo</strong> resultante, que estira o nervo. Pergunte sobre fratura do cotovelo na infância em qualquer adulto com neuropatia ulnar inexplicada e cotovelo em valgo.",
          "color": "red",
          "label": "Armadilha — não passe despercebido"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "6.3 Nervo radial"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "6.3.1 Trajeto"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Espirala-se ao longo da face posterior do úmero, no <strong>sulco espiral</strong>, e então <strong>perfura o septo intermuscular lateral cerca de 10 cm acima do epicôndilo lateral</strong> para entrar no compartimento anterior.</li><li>Situa-se no sulco entre o <strong>braquial e o braquiorradial</strong>, e então se divide, aproximadamente no nível da articulação radiocapitelar, em:</li><li>— o <strong>nervo radial superficial</strong> (puramente sensitivo, para a região dorsorradial da mão), e</li><li>— o <strong>nervo interósseo posterior (NIP)</strong> (puramente motor), que entra no <strong>supinador por baixo da arcada de Frohse</strong>.</li></ul>"
        }
      },
      {
        "block_type": "subsubsection_heading",
        "content_config": {
          "text": "6.3.2 O túnel radial — cinco pontos potenciais de compressão"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Bandas fibrosas anteriores à articulação radiocapitelar</li><li>O <strong>leque vascular de Henry</strong> — os vasos radiais recorrentes cruzando o nervo</li><li>A <strong>borda medial (cortante) do extensor radial curto do carpo</strong></li><li>A <strong>arcada de Frohse</strong> — a borda proximal fibrosa do supinador; o local mais comum</li><li>A borda distal do supinador</li></ul>"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Sintoma</strong>",
              "Dor",
              "Fraqueza"
            ],
            [
              "<strong>Fraqueza</strong>",
              "<strong>Nenhuma</strong>",
              "<strong>Queda dos dedos e do polegar</strong>"
            ],
            [
              "<strong>Perda sensitiva</strong>",
              "Nenhuma",
              "Nenhuma (o NIP é puramente motor)"
            ],
            [
              "<strong>Extensão do punho</strong>",
              "Normal",
              "Presente, mas <strong>com desvio radial</strong> — o extensor radial longo do carpo é poupado"
            ],
            [
              "<strong>Dor à palpação</strong>",
              "<strong>3–5 cm distalmente</strong> ao epicôndilo lateral, sobre o supinador",
              "Variável"
            ],
            [
              "<strong>EMG</strong>",
              "Frequentemente normal",
              "Denervação nos músculos supridos pelo NIP"
            ]
          ],
          "columns": [
            "",
            "<strong>Síndrome do túnel radial</strong>",
            "<strong>Síndrome do NIP</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>A regra mais útil sobre o nervo radial no cotovelo:</strong> o <strong>NIP é puramente motor</strong> e o <strong>extensor radial longo do carpo é suprido acima dele</strong>. Assim, um paciente com queda dos dedos, um punho que ainda estende (mas desvia para radial), e <strong>sensibilidade inteiramente normal</strong> tem uma lesão do NIP — não uma paralisia do nervo radial no sulco espiral, nem uma radiculopatia C7.<br><br>Acrescente o <strong>braquiorradial</strong> ao estudo com agulha: ele é radial, mas <strong>proximal ao NIP</strong>, de modo que está normal na paralisia do NIP e alterado em uma lesão do sulco espiral.",
          "color": "violet",
          "label": "EMG / eletrodiagnóstico"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "6.4 Nervos cutâneos ao redor do cotovelo"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Cutâneo antebraquial lateral</strong>",
              "Ramo terminal do nervo <strong>musculocutâneo</strong>",
              "Antebraço lateral",
              "Emerge lateralmente ao tendão do bíceps — <strong>o nervo lesado no reparo do bíceps distal</strong> e em punções venosas antecubitais malsucedidas"
            ],
            [
              "<strong>Cutâneo antebraquial medial</strong>",
              "<strong>Fascículo medial (C8–T1)</strong>",
              "Antebraço medial",
              "Seu potencial de ação sensitivo (SNAP) está <strong>reduzido na plexopatia do tronco inferior e na síndrome do desfiladeiro torácico neurogênica verdadeira</strong> — um estudo fundamental, pois é preservado na neuropatia ulnar no cotovelo"
            ],
            [
              "<strong>Cutâneo antebraquial posterior</strong>",
              "Nervo radial, no braço",
              "Antebraço posterior",
              "Poupado nas lesões do NIP; afetado nas lesões radiais altas"
            ]
          ],
          "columns": [
            "<strong>Nervo</strong>",
            "<strong>Origem</strong>",
            "<strong>Território</strong>",
            "<strong>Relevância</strong>"
          ]
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "6.5 Resumo de localização"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Flexão do cotovelo</strong>",
              "Fraca",
              "Normal",
              "Braquiorradial fraco",
              "Normal"
            ],
            [
              "<strong>Extensão do cotovelo</strong>",
              "Normal",
              "<strong>Fraca</strong>",
              "<strong>Fraca</strong>",
              "Normal"
            ],
            [
              "<strong>Extensão do punho</strong>",
              "Fraca",
              "Fraca",
              "<strong>Fraca (queda)</strong>",
              "Presente, com <strong>desvio radial</strong>"
            ],
            [
              "<strong>Extensão dos dedos</strong>",
              "Normal",
              "Fraca",
              "Fraca",
              "<strong>Fraca</strong>"
            ],
            [
              "<strong>Perda sensitiva</strong>",
              "Polegar, antebraço lateral",
              "Dedo médio",
              "Espaço interdigital dorsal",
              "<strong>Nenhuma</strong>"
            ],
            [
              "<strong>Reflexo</strong>",
              "Braquiorradial, bíceps",
              "<strong>Tríceps</strong>",
              "O tríceps pode ser poupado",
              "Normal"
            ]
          ],
          "columns": [
            "",
            "<strong>Radiculopatia C6</strong>",
            "<strong>Radiculopatia C7</strong>",
            "<strong>Radial (sulco espiral)</strong>",
            "<strong>NIP</strong>"
          ]
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "7. Anatomia Vascular e a Fossa Cubital"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "7.1 Artéria braquial"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Desce até a fossa <strong>medialmente ao tendão do bíceps e lateralmente ao nervo mediano</strong>.</li><li>Divide-se, aproximadamente no nível do <strong>colo do rádio</strong>, nas artérias <strong>radial</strong> e <strong>ulnar</strong>.</li><li>É recoberta pela <strong>aponeurose bicipital</strong>, que a separa da veia mediana cubital — a razão anatômica pela qual a punção venosa costuma ser segura nesse local.</li></ul>"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "7.2 A anastomose ao redor do cotovelo"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li>Uma rica rede colateral permite que o membro sobreviva à oclusão da artéria braquial. Ela combina ramos <strong>colaterais</strong>, vindos de cima, com ramos <strong>recorrentes</strong>, vindos de baixo.</li></ul>"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Medial</strong>",
              "Colateral ulnar superior e inferior",
              "Recorrente ulnar anterior e posterior"
            ],
            [
              "<strong>Lateral</strong>",
              "Colateral radial (da artéria braquial profunda)",
              "Recorrente radial"
            ],
            [
              "<strong>Posterior</strong>",
              "Colateral média (da artéria braquial profunda)",
              "Recorrente interóssea"
            ]
          ],
          "columns": [
            "<strong>Lado</strong>",
            "<strong>De cima (colateral)</strong>",
            "<strong>De baixo (recorrente)</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>A fratura supracondiliana na criança é a ameaça clássica a essa artéria.</strong> O fragmento proximal deslocado pode lesar a artéria braquial e o nervo mediano.<br><br>Fique atento à <strong>contratura isquêmica de Volkmann</strong> — síndrome compartimental do antebraço que produz fibrose dos flexores profundos e uma garra fixa. O sinal mais precoce é a <strong>dor à extensão passiva dos dedos</strong>, não a ausência de pulso. Um pulso palpável <strong>não</strong> exclui síndrome compartimental.",
          "color": "red",
          "label": "Armadilha — não passe despercebido"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "7.3 A fossa cubital"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Superior (base)</strong>",
              "Linha imaginária entre os dois epicôndilos"
            ],
            [
              "<strong>Lateral</strong>",
              "Braquiorradial"
            ],
            [
              "<strong>Medial</strong>",
              "Pronador redondo"
            ],
            [
              "<strong>Assoalho</strong>",
              "Braquial e supinador"
            ],
            [
              "<strong>Teto</strong>",
              "Pele, fáscia superficial (com a veia mediana cubital), fáscia profunda, reforçada pela <strong>aponeurose bicipital</strong>"
            ]
          ],
          "columns": [
            "<strong>Limite</strong>",
            "<strong>Estrutura</strong>"
          ]
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Conteúdo, de lateral para medial:</strong> Nervo radial (sob o braquiorradial) · <strong>Tendão do Bíceps</strong> · <strong>Artéria Braquial</strong> · <strong>Nervo Mediano</strong>.</li></ul>"
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>\"Really Need Beer To Be At My Nicest\"</strong> — mnemônico em inglês cujas iniciais correspondem a <strong>R</strong>adial <strong>N</strong>erve (nervo radial), <strong>B</strong>iceps <strong>T</strong>endon (tendão do bíceps), <strong>B</strong>rachial <strong>A</strong>rtery (artéria braquial), <strong>M</strong>edian <strong>N</strong>erve (nervo mediano), de lateral para medial.<br><br>Mais simples ainda para os três centrais: <strong>TAN</strong> — <strong>T</strong>endão, <strong>A</strong>rtéria, <strong>N</strong>ervo, de lateral para medial.",
          "color": "green",
          "label": "Mnemônico"
        }
      },
      {
        "block_type": "section_heading",
        "content_config": {
          "text": "Revisão Rápida"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "8.1 Problemas comuns relacionados à anatomia"
        }
      },
      {
        "block_type": "comparison_table",
        "content_config": {
          "rows": [
            [
              "<strong>Epicondilalgia lateral</strong>",
              "Origem do extensor radial curto do carpo",
              "Tendinopatia degenerativa, não inflamação → sobrecarregue o tendão, não o infiltre repetidamente"
            ],
            [
              "<strong>Epicondilalgia medial</strong>",
              "Origens do pronador redondo e do flexor radial do carpo",
              "O nervo ulnar situa-se imediatamente posterior → examine-o em todos os casos"
            ],
            [
              "<strong>Síndrome do túnel cubital</strong>",
              "Nervo ulnar no ligamento de Osborne",
              "A flexão estreita e estica o nervo → órtese noturna em extensão"
            ],
            [
              "<strong>Síndrome do túnel radial</strong>",
              "NIP sob a arcada de Frohse",
              "Dor 3–5 cm distalmente ao epicôndilo, sem fraqueza → o \"cotovelo de tenista refratário\""
            ],
            [
              "<strong>Ruptura do bíceps distal</strong>",
              "Tendão na tuberosidade radial",
              "Predomina a fraqueza da supinação → hook test; nervo cutâneo antebraquial lateral em risco no reparo"
            ],
            [
              "<strong>Bursite olecraniana</strong>",
              "Bursa subcutânea",
              "Extra-articular → edema com movimento preservado"
            ],
            [
              "<strong>Sobrecarga em extensão-valgo</strong>",
              "LCU + olécrano posteromedial",
              "Arremessadores: frouxidão do LCU → impacto posteromedial e osteófitos"
            ],
            [
              "<strong>Rigidez pós-traumática</strong>",
              "Cápsula, braquial, feixe posterior do LCU",
              "Uma única cápsula, braquial sobre a cápsula → perda global e alto risco de OH"
            ]
          ],
          "columns": [
            "<strong>Apresentação</strong>",
            "<strong>Estrutura</strong>",
            "<strong>Explicação anatômica</strong>"
          ]
        }
      },
      {
        "block_type": "highlight_card",
        "content_config": {
          "text": "<strong>Ossificação heterotópica: o cotovelo é a articulação mais comumente afetada no membro superior</strong>, particularmente após fratura-luxação, queimaduras, e em pacientes com <strong>traumatismo cranioencefálico ou lesão medular</strong>.<br><br>Razão anatômica: o <strong>braquial situa-se diretamente sobre a cápsula anterior</strong>, de modo que o hematoma e a lesão muscular ficam em contato com o periósteo.<br><br>Implicações práticas: fique atento a um <strong>platô ou reversão dos ganhos de amplitude, associado a um cotovelo quente, endurecido e doloroso</strong> nas primeiras semanas após a lesão; utilize <strong>mobilização ativa suave, em vez de alongamento passivo forçado</strong>, que a provoca; e lembre-se de que a manipulação agressiva precoce é um fator precipitante reconhecido.",
          "color": "accent",
          "label": "Pérola clínica de MFR"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "8.2 Quinze pérolas"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Três articulações, uma cápsula</strong> — derrame, contratura e injeção afetam as três igualmente.</li><li><strong>O arco funcional é de 30–130° com rotação de 50°/50°.</strong> Defina as metas pela função, não pela amplitude total.</li><li><strong>O cotovelo é mantido a 70–80° porque é onde o volume capsular é máximo</strong> — um forte sinal de derrame.</li><li><strong>Um coxim adiposo posterior visível indica derrame e, no trauma, uma fratura oculta.</strong></li><li><strong>CRITOE:</strong> o epicôndilo medial ossifica antes da tróclea — um centro \"troclear\" sem epicôndilo medial é um fragmento avulsionado encarcerado.</li><li><strong>O feixe anterior do LCU, do epicôndilo ao tubérculo sublime, é o principal freio ao valgo.</strong></li><li><strong>O LCUL é o principal freio à instabilidade rotatória posterolateral</strong> — proteja-o de infiltrações profundas de corticoide na região lateral.</li><li><strong>A pronação protege o lado lateral; a supinação protege o lado medial</strong> ao reabilitar uma luxação.</li><li><strong>O braquial situa-se sobre a cápsula anterior</strong> — a razão pela qual o cotovelo é o ponto crítico de ossificação heterotópica do membro superior.</li><li><strong>O braquiorradial é um flexor suprido pelo nervo radial</strong> — o músculo-chave para diferenciar radiculopatia C6 de neuropatia radial.</li><li><strong>O extensor radial longo do carpo origina-se acima da origem extensora comum</strong> — poupado no cotovelo de tenista e na paralisia do NIP, de modo que o punho ainda estende, mas desvia para radial.</li><li><strong>O NIP é puramente motor; a síndrome do túnel radial é dor pura.</strong> Fraqueza associada a sensibilidade normal localiza instantaneamente.</li><li><strong>O ramo cutâneo palmar diferencia a síndrome do pronador da síndrome do túnel do carpo</strong> — dormência tenar aponta para uma lesão proximal.</li><li><strong>O ramo cutâneo dorsal diferencia o túnel cubital do canal de Guyon</strong> — dormência dorsal no território ulnar aponta para o cotovelo.</li><li><strong>Verifique a relação dos três pontos antes e depois de toda redução.</strong></li></ul>"
        }
      },
      {
        "block_type": "subsection_heading",
        "content_config": {
          "text": "8.3 Sinais de alerta"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "<ul><li><strong>Cotovelo quente, edemaciado, extremamente doloroso e mantido imóvel</strong> → artrite séptica. Aspire antes de qualquer corticoide, sempre.</li><li><strong>Edema posterior flutuante com febre ou celulite</strong> → bursite olecraniana séptica.</li><li><strong>Dor à extensão passiva dos dedos após uma fratura supracondiliana</strong> → síndrome compartimental. Um pulso presente não a exclui.</li><li><strong>Perda progressiva de amplitude com um cotovelo quente e endurecido após trauma ou lesão cerebral</strong> → ossificação heterotópica.</li><li><strong>Dor intensa seguida de fraqueza em mosaico, frequentemente com predomínio do NIA</strong> → amiotrofia neurálgica, não uma neuropatia compressiva.</li><li><strong>Dor noturna, dor em repouso ou sintomas sistêmicos com exame mecânico normal</strong> → solicite exame de imagem; considere infecção ou tumor.</li><li><strong>Neuropatia ulnar de início recente em um adulto com cúbito valgo</strong> → paralisia ulnar tardia; pergunte sobre fratura na infância.</li></ul>"
        }
      },
      {
        "block_type": "paragraph",
        "content_config": {
          "body": "Apenas anatomia. A biomecânica do cotovelo — o eixo de rotação, a carga em valgo no arremesso, a transmissão de forças e a cinemática da instabilidade — é tratada separadamente."
        }
      }
    ]
  }
];

export async function GET() {
  const topicRows = await pool.query(
    `SELECT id FROM topic WHERE name = 'Anatomy' AND kind = 'topic' AND parent_id IS NULL`
  );
  if (topicRows.rows.length !== 1) {
    return NextResponse.json(
      { ok: false, error: "Expected exactly one root-level 'Anatomy' topic", candidates: topicRows.rows },
      { status: 409 }
    );
  }
  const anatomyTopicId = topicRows.rows[0].id as string;

  const results: { slug: string; ok: boolean; diseaseId?: string; blocksInserted?: number; error?: string }[] = [];

  for (const page of pages) {
    const existing = await pool.query(`SELECT id FROM disease WHERE slug = $1`, [page.slug]);
    if (existing.rows.length > 0) {
      results.push({ slug: page.slug, ok: false, error: "already exists" });
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `INSERT INTO disease (canonical_name, slug, topic_id, status, evidence_based, source_locale, aliases)
         VALUES ($1, $2, $3, 'published', true, 'en', $4)
         RETURNING id`,
        [page.canonicalName, page.slug, anatomyTopicId, ["Elbow Anatomy translation"]]
      );
      const diseaseId = rows[0].id as string;
      let position = 10;
      for (const block of page.blocks) {
        await client.query(
          `INSERT INTO editorial_block (disease_id, position, block_type, content_config, status, source_locale)
           VALUES ($1, $2, $3, $4, 'published', 'en')`,
          [diseaseId, position, block.block_type, block.content_config]
        );
        position += 10;
      }
      await client.query("COMMIT");
      results.push({ slug: page.slug, ok: true, diseaseId, blocksInserted: page.blocks.length });
    } catch (err) {
      await client.query("ROLLBACK");
      results.push({ slug: page.slug, ok: false, error: String(err) });
    } finally {
      client.release();
    }
  }

  return NextResponse.json({ ok: true, topicId: anatomyTopicId, results });
}
