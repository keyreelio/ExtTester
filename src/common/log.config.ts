import {Category, CategoryConfiguration, CategoryServiceFactory, LogLevel} from "typescript-logging";


CategoryServiceFactory.setDefaultConfiguration(new CategoryConfiguration(LogLevel.Warn));


export let testerLogger = new Category("tester");
export let testapiLogger = new Category("testAPI");

export let engineLogger = new Category("engine");
export let dashlaneEngineLogger = new Category("dashlane", engineLogger);
export let lastpassEngineLogger = new Category("pastpass", engineLogger);
export let onePasswordEngineLogger = new Category("1password", engineLogger);
export let keyreelEngineLogger = new Category("keyreel", engineLogger);

export let reportLogger = new Category("report");

export let serviceJSLogger = new Category("servicejs");

export let loggingServiceJSLogger = new Category("logservice");
export let hostServiceJSLogger = new Category("hostservice");
