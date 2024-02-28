import { Question, QuestionMatrixDynamicModel, Serializer, SurveyModel } from "survey-core";
import { ICreatorPreset, CreatorPresetBase, CreatorPresetEditableBase } from "./presets-base";
import { SurveyCreatorModel } from "../creator-base";
import { IQuestionToolboxItem, IToolboxCategoryDefinition } from "../toolbox";
import { SurveyJSON5 } from "../json5";

export interface ICreatorPresetToolboxItem {
  name: string;
  iconName?: string;
  json?: any;
  title?: string;
  tooltip?: string;
}

export class CreatorPresetEditableToolboxDefinition extends CreatorPresetEditableBase {
  public createMainPageCore(): any {
    const parent = <CreatorPresetEditableToolbox>this.parent;
    return {
      visibleIf: this.getBoolVisibleIf(parent.nameDefinitionShow),
      elements: [
        {
          type: "matrixdynamic",
          name: this.nameMatrix,
          rowCount: 0,
          columns: [
            { cellType: "text", name: "name", isUnique: true, isRequired: true },
            { cellType: "text", name: "iconName" },
            { cellType: "text", name: "title" }
          ],
          detailPanelMode: "underRow",
          detailElements: [
            { type: "text", name: "tooltip" },
            { type: "comment", name: "json", rows: 15 }
          ]
        }
      ]
    };
  }
  protected validateCore(model: SurveyModel): boolean {
    const matrix = this.getMatrix(model);
    const val = matrix.value;
    if(!Array.isArray(val)) return true;
    for(let rowIndex = 0; rowIndex < val.length; rowIndex ++) {
      const json = val[rowIndex]["json"];
      if(!!json) {
        if(!this.validateJson(json)) {
          const row = matrix.visibleRows[rowIndex];
          row.showDetailPanel();
          const jsonQuestion = row.getQuestionByName("json");
          jsonQuestion.addError("The json is invalid"); //
          jsonQuestion.focus();
          return false;
        }
      }
    }
    return true;
  }
  public getJsonValueCore(model: SurveyModel): any {
    const matrix = this.getMatrix(model);
    const value = matrix.value;
    if(!Array.isArray(value) || value.length === 0) return undefined;
    const res = [];
    for(let i = 0; i < value.length; i ++) {
      const val = {};
      const item = value[i];
      for(let key in item) {
        const itemVal = key === "json" ? this.parseJson(item[key]) : item[key];
        if(!!itemVal) {
          val[key] = itemVal;
        }
      }
      res.push(val);
    }
    return res;
  }
  public setupEditableQuestionValueCore(model: SurveyModel, json: any, creator: SurveyCreatorModel): void {
    json = json || [];
    const question = this.getMatrix(model);
    const value = [];
    json.forEach(item => {
      const val = {};
      for(let key in item) {
        val[key] = key === "json" ? JSON.stringify(item[key], null, 2) : item[key];
      }
      value.push(val);
    });
    question.value = value;
  }
  private getMatrix(model: SurveyModel): QuestionMatrixDynamicModel {
    return <QuestionMatrixDynamicModel>model.getQuestionByName(this.nameMatrix);
  }
  private get nameMatrix() { return this.fullPath + "_matrix"; }
  private validateJson(text: string): boolean {
    text = text.trim();
    if(!text) return true;
    const json = this.parseJson(text);
    if(!json || !json.type) return false;
    const obj = Serializer.createClass(json.type, json);
    return !!obj;
  }
  private parseJson(text: string): any {
    try {
      const res = new SurveyJSON5().parse(text);
      return res;
    } catch(e) {
      return undefined;
    }
  }
}

export class CreatorPresetToolboxDefinition extends CreatorPresetBase {
  public getPath(): string { return "definition"; }
  protected applyCore(creator: SurveyCreatorModel): void {
    super.applyCore(creator);
    this.applyDefinition(creator, this.json);
  }
  public createEditable(): CreatorPresetEditableBase { return new CreatorPresetEditableToolboxDefinition(this); }
  private applyDefinition(creator: SurveyCreatorModel, defintion: Array<ICreatorPresetToolboxItem>): void {
    if (!Array.isArray(defintion)) return;
    const tb = creator.toolbox;
    defintion.forEach(item => {
      if (typeof item === "object" && !!item.name) {
        const action = tb.getItemByName(item.name);
        if (action) {
          for (let key in item) {
            action[key] = item[key];
          }
        } else {
          if (!!item.json) {
            tb.addItem(<IQuestionToolboxItem>item);
          }
        }
      }
    });
  }
}
export class CreatorPresetToolboxCategories extends CreatorPresetBase {
  public getPath(): string { return "categories"; }
  protected applyCore(creator: SurveyCreatorModel): void {
    super.applyCore(creator);
    this.applyItems(creator, this.json);
  }
  private applyItems(creator: SurveyCreatorModel, categories: Array<IToolboxCategoryDefinition>): void {
    if (!Array.isArray(categories)) return;
    creator.toolbox.defineCategories(categories);
    creator.toolbox.hasCategories = true;
  }
}
export class CreatorPresetToolboxItems extends CreatorPresetBase {
  public getPath(): string { return "items"; }
  protected applyCore(creator: SurveyCreatorModel): void {
    super.applyCore(creator);
    this.applyItems(creator, this.json);
  }
  private applyItems(creator: SurveyCreatorModel, items: Array<string>): void {
    if (!Array.isArray(items)) return;
    creator.toolbox.defineCategories([{ category: "general", items: items }]);
    creator.toolbox.hasCategories = false;
  }
}

export class CreatorPresetEditableToolbox extends CreatorPresetEditableBase {
  public createMainPageCore(): any {
    return {
      elements: [
        {
          type: "boolean",
          name: this.nameDefinitionShow,
        },
        {
          name: this.nameSetupCategoriesShow,
          type: "boolean"
        },
        {
          name: this.nameCategoriesMode,
          type: "buttongroup",
          defaultValue: "categories",
          choices: ["categories", "items"],
          visibleIf: this.getBoolVisibleIf(this.nameSetupCategoriesShow)
        }
      ]
    };
  }
  public setupEditableQuestionValueCore(model: SurveyModel, json: any, creator: SurveyCreatorModel): void {
    json = json || {};
    if(json["definition"]) {
      model.setValue(this.nameDefinitionShow, true);
    }
  }
  public get nameDefinitionShow() { return this.path + "_definition_show"; }
  private get nameSetupCategoriesShow() { return this.path + "_categories_show"; }
  public get nameCategoriesMode() { return this.path + "_categories_mode"; }
}

export class CreatorPresetToolbox extends CreatorPresetBase {
  public getPath(): string { return "toolbox"; }
  public createEditable(): CreatorPresetEditableBase { return new CreatorPresetEditableToolbox(this); }
  protected createPresets(): Array<ICreatorPreset> {
    return [new CreatorPresetToolboxDefinition(), new CreatorPresetToolboxItems(),
      new CreatorPresetToolboxCategories()];
  }
}
