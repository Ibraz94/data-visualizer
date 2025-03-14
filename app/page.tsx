'use client';
import React, { useEffect, useRef, useState } from 'react';
import * as go from 'gojs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Field {
  name: string;
  value?: any;
  isPrimary?: boolean;
  isForeign?: boolean;
  relatedTable?: string;
}

interface Table {
  key: number;
  name: string;
  fields: Field[];
}

interface Relationship {
  from: number;
  to: number;
  text?: string;
  fromText?: string;
  toText?: string;
}

export default function ERDDiagram(): JSX.Element {
  const diagramRef = useRef<HTMLDivElement>(null);
  const diagramInstance = useRef<go.Diagram | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [tables, setTables] = useState<Table[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [error, setError] = useState<string>('');

  // Panels

  const getNodeTemplate = (): go.Node => {
    const $ = go.GraphObject.make;
    return $(go.Node, "Auto",
      { movable: true },
      $(go.Shape, "RoundedRectangle", {
        fill: "gray",
        stroke: "black",
        strokeWidth: 2,
        alignment: go.Spot.Center
      }),


      $(go.Panel, "Vertical",
        {
          background: "gray",
          padding: 4,
        },

        $(go.TextBlock,
          {
            margin: 4,
            font: "bold 14px sans-serif",
            editable: false,
            click: (e: go.InputEvent, obj: go.GraphObject) => {
              const panel = obj.part as go.Node;
              const details = panel.findObject("DETAILS");
              if (details) details.visible = !details.visible;
              panel.updateTargetBindings();
              diagramInstance.current?.requestUpdate();
            }
          },
          new go.Binding("text", "name")
        ),


        $(go.Panel, "Vertical",
          { name: "", visible: true, margin: 4 },

          $(go.TextBlock,
            { font: "bold 14px sans-serif", stroke: "white" },
            new go.Binding("visible", "fields", (fields: Field[]) => fields.some(f => f.isPrimary))
          ),

          $(go.Panel, "Vertical",
            new go.Binding("itemArray", "fields", (fields: Field[]) => fields.filter(f => f.isPrimary)),
            {
              itemTemplate: $(go.Panel, "Horizontal",
                $(go.TextBlock,
                  { margin: new go.Margin(2, 0), stroke: "black" },
                  new go.Binding("text", "name")
                ),
                $(go.TextBlock,
                  { margin: new go.Margin(2, 5), stroke: "white" },
                  new go.Binding("text", "value", v => v !== undefined ? String(v) : "unknown")
                ))
            }),

          $(go.Panel, "Vertical",
            new go.Binding("itemArray", "fields", (fields: Field[]) =>
              fields.filter(f => !f.isForeign && !f.isPrimary)
            ),
            {
              itemTemplate: $(go.Panel, "Horizontal",
                $(go.TextBlock,
                  { margin: new go.Margin(2, 0), stroke: "black" },
                  new go.Binding("text", "name")
                ),
                $(go.TextBlock,
                  { margin: new go.Margin(2, 5), stroke: "black" },
                  new go.Binding("text", "value", v => Array.isArray(v) ? v.join(", ") : (v !== undefined ? String(v) : "unknown"))
                ))
            }),

          $(go.TextBlock,
            { text: "INHERITED ATTRIBUTES", font: "bold 10px sans-serif", stroke: "white" },
            new go.Binding("visible", "fields", (fields: Field[]) => fields.some(f => f.isForeign))
          ),

          $(go.Panel, "Vertical",
            new go.Binding("itemArray", "fields", (fields: Field[]) => fields.filter(f => f.isForeign)),
            {
              itemTemplate: $(go.Panel, "Horizontal",
                $(go.TextBlock,
                  { margin: new go.Margin(2, 0), stroke: "black" },
                  new go.Binding("text", "name")
                ),
                $(go.TextBlock,
                  { margin: new go.Margin(2, 5), stroke: "white" },
                  new go.Binding("text", "value", v => Array.isArray(v) ? v.join(", ") : (v !== undefined ? String(v) : "unknown"))
                )
              )
            }
          )
        )
      )
    );
  };

  //  Links

  const getLinkTemplate = (): go.Link => {
    const $ = go.GraphObject.make;
    return $(go.Link,
      {
        routing: go.Link.AvoidsNodes,
        curve: go.Link.JumpOver,
        corner: 100,
        layerName: "Foreground"
      },


      $(go.Shape, {
        strokeWidth: 2,
        stroke: "black",
        fromSpot: go.Spot.AllSides,
        toSpot: go.Spot.Top,
        toArrow: "Standard",
        fill: "black"
      }),

      $(go.TextBlock,
        {
          segmentOffset: new go.Point(0, -15),
          stroke: "white",
          font: "10px sans-serif"
        },
        new go.Binding("text", "fromText", t => t || "1")
      ),

      $(go.TextBlock,
        {
          segmentOffset: new go.Point(0, 15),
          stroke: "white",
          font: "10px sans-serif"
        },
        new go.Binding("text", "toText", t => t || "N")
      ))
  };


  useEffect(() => {
    if (diagramRef.current) {
      const $ = go.GraphObject.make;

      const diagram = $(go.Diagram, diagramRef.current, {
        "undoManager.isEnabled": true,
        "grid.visible": true,
        "initialContentAlignment": go.Spot.TopLeftSides,
        "toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom,
        layout: $(go.LayeredDigraphLayout, {
          direction: 90,
          layerSpacing: 300,
          columnSpacing: 300
        }),
        model: $(go.GraphLinksModel, {
          nodeKeyProperty: "key"
        })
      });

      diagram.nodeTemplate = getNodeTemplate();
      diagram.linkTemplate = getLinkTemplate();
      diagramInstance.current = diagram;

      console.log("Diagram initialized:", diagram);

      return () => {
        diagram.div = null;
        diagramInstance.current = null;
      };
    }
  }, []);

  useEffect(() => {
    if (!diagramInstance.current) {
      console.log("Diagram instance not available");
      return;
    }

    if (!tables.length) {
      console.log("No tables to render");
      return;
    }

    const diagram = diagramInstance.current;
    const model = diagram.model as go.GraphLinksModel;

    console.log('Updating diagram with:', { tables, relationships });



    model.startTransaction("update diagram");
    model.nodeDataArray = [...tables];
    model.linkDataArray = [...relationships];
    model.commitTransaction("update diagram");

    diagram.requestUpdate();
    console.log("Diagram update requested. Current nodes:", diagram.nodes.count, "links:", diagram.links.count);
  }, [tables, relationships]);


  const normalizeData = (data: any): { tables: Table[], relationships: Relationship[] } => {
    let tables: Table[] = [];
    let relationships: Relationship[] = [];
    const tableMap = new Map<number, string>();

    const extractFields = (obj: any, prefix: string = ''): Field[] => {
      let fields: Field[] = [];
      Object.entries(obj).forEach(([key, value], index) => {
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          return;
        }
        if (typeof value === 'object' && value !== null) {
          fields.push(...extractFields(value, `${prefix}${key}_`));
        } else {
          const field: Field = {
            name: `${prefix}${key}`,
            value: value,
            isPrimary: key.toLowerCase() === 'name' || (prefix === '' && index === 0),
            isForeign: key.toLowerCase().includes('id') && prefix !== ''
          };
          fields.push(field);
        }
      });
      return fields;
    };

    const createTable = (obj: any, tableName: string, key: number): Table => {
      const fields = extractFields(obj);
      if (!fields.some(f => f.isPrimary)) {
        const nameField = fields.find(f => f.name.toLowerCase() === 'name');
        if (nameField) nameField.isPrimary = true;
        else if (fields.length > 0) fields[0].isPrimary = true;
      }
      tableMap.set(key, tableName);
      return { key, name: tableName, fields };
    };

    const processRelatedArrays = (obj: any, parentKey: number, parentName: string, depth: number = 0): void => {
      if (depth > 5) return;
      if (typeof obj !== 'object' || obj === null) return;

      Object.entries(obj).forEach(([key, value], index) => {
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          value.forEach((item: any, itemIndex: number) => {
            const relatedTableKey = tables.length + 1;
            const relatedTableName = item.name || `${key}_${itemIndex + 1}`;

            const relatedTable = createTable(item, relatedTableName, relatedTableKey);
            tables.push(relatedTable);
            relationships.push({
              from: parentKey,
              to: relatedTableKey,
              text: "members",
              fromText: "1",
              toText: "N"
            });
            processRelatedArrays(item, relatedTableKey, relatedTableName, depth + 1);
          });
        } else if (typeof value === 'object') {
          processRelatedArrays(value, parentKey, parentName, depth + 1);
        } else if (typeof value === 'string' && key.toLowerCase().includes('id')) {
          const relatedTableName = key.replace(/Id$/i, ''); 
          const relatedTableKey = findTableKeyByName(relatedTableName);
          if (relatedTableKey && parentKey !== relatedTableKey) {
            relationships.push({
              from: parentKey,
              to: relatedTableKey,
              text: `refers to ${relatedTableName}`,
              fromText: "1",
              toText: "1"
            });
          }
        }
      });
    };

    const findTableKeyByName = (tableName: string): number | undefined => {
      for (const [key, name] of tableMap.entries()) {
        if (name.toLowerCase().includes(tableName.toLowerCase())) {
          return key;
        }
      }
      return undefined;
    };

    if (typeof data === 'object' && data !== null) {
      const mainTableKey = 1;
      const mainTableName = "Company"
      const mainTable = createTable(data, mainTableName, mainTableKey);
      tables.push(mainTable);
      processRelatedArrays(data, mainTableKey, mainTableName);
      console.log('Normalized data:', { tables, relationships });
    }

    return { tables, relationships };
  };


  const drawDiagram = () => {
    if (!fileContent) {
      setError('No file content to process');
      return;
    }

    setError('');
    console.log('Processing file content:', fileContent);

    try {
      const data = JSON.parse(fileContent);
      console.log('Parsed JSON:', data);

      const { tables: normalizedTables, relationships: normalizedRelationships } = normalizeData(data);

      if (!normalizedTables.length) {
        throw new Error('No valid tables could be extracted from the JSON');
      }

      setTables(normalizedTables);
      setRelationships(normalizedRelationships);
    } catch (error) {
      console.error('Error processing file:', error);
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      console.log('File content loaded:', content);
      setFileContent(content);
    };
    reader.onerror = () => setError('Error reading file');
    reader.readAsText(file);
  };


  return (
    <div className="flex min-h-screen p-4 gap-4">
      <div className="w-72 bg-gray-100 p-4 rounded">
        <h1 className="text-2xl font-bold mb-4 text-center">Data Visualizer</h1>
        <Label className='text-center'>Upload File</Label>
        <Input
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="mb-4 w-full file:bg-black file:text-white file:rounded-lg py-3 hover:file:cursor-pointer file:text-md file:h-8 h-14"
        />
        <Button
          onClick={drawDiagram}
          className="w-full p-2"
          disabled={!fileContent}
        >
          Draw Diagram
        </Button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      <div className="flex-1">
        <div
          ref={diagramRef}
          className="w-full h-full border border-gray-300"
          style={{ background: "#d1d5db" }}
        />
      </div>
    </div>
  );
};
