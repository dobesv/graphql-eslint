import {
  GraphQLSchema,
  GraphQLFieldMap,
  GraphQLInputFieldMap,
  GraphQLField,
  GraphQLInputField,
  GraphQLInputType,
  GraphQLOutputType,
  GraphQLNamedType,
  GraphQLInterfaceType,
  GraphQLArgument,
  isObjectType,
  isInterfaceType,
  isUnionType,
  isInputObjectType,
  isListType,
  isNonNullType,
} from 'graphql';

export function createReachableTypesService(schema: GraphQLSchema): () => Set<string>;
export function createReachableTypesService(schema?: GraphQLSchema): () => Set<string> | null {
  if (schema) {
    let cache: Set<string> = null;
    return () => {
      if (!cache) {
        cache = collectReachableTypes(schema);
      }

      return cache;
    };
  }

  return () => null;
}

export function collectReachableTypes(schema: GraphQLSchema): Set<string> {
  const reachableTypes = new Set<string>();

  collectFrom(schema.getQueryType());
  collectFrom(schema.getMutationType());
  collectFrom(schema.getSubscriptionType());

  return reachableTypes;

  function collectFrom(type?: GraphQLNamedType): void {
    if (type && shouldCollect(type.name)) {
      if (isObjectType(type)) {
        collectFromFieldMap(type.getFields());
        collectFromInterfaces(type.getInterfaces());
      } else if (isInterfaceType(type)) {
        collectFromFieldMap(type.getFields());
        collectFromInterfaces(type.getInterfaces());
        collectFromImplementations(type);
      } else if (isUnionType(type)) {
        type.getTypes().forEach(collectFrom);
      } else if (isInputObjectType(type)) {
        collectFromInputFieldMap(type.getFields());
      }
    }
  }

  function collectFromFieldMap(fieldMap: GraphQLFieldMap<any, any>): void {
    for (const fieldName in fieldMap) {
      collectFromField(fieldMap[fieldName]);
    }
  }

  function collectFromField(field: GraphQLField<any, any>): void {
    collectFromOutputType(field.type);
    field.args.forEach(collectFromArgument);
  }

  function collectFromArgument(arg: GraphQLArgument): void {
    collectFromInputType(arg.type);
  }

  function collectFromInputFieldMap(fieldMap: GraphQLInputFieldMap): void {
    for (const fieldName in fieldMap) {
      collectFromInputField(fieldMap[fieldName]);
    }
  }

  function collectFromInputField(field: GraphQLInputField): void {
    collectFromInputType(field.type);
  }

  function collectFromInterfaces(interfaces: GraphQLInterfaceType[]): void {
    if (interfaces) {
      interfaces.forEach(collectFrom);
    }
  }

  function collectFromOutputType(output: GraphQLOutputType): void {
    collectFrom(schema.getType(resolveName(output)));
  }

  function collectFromInputType(input: GraphQLInputType): void {
    collectFrom(schema.getType(resolveName(input)));
  }

  function collectFromImplementations(type: GraphQLInterfaceType): void {
    schema.getPossibleTypes(type).forEach(collectFrom);
  }

  function resolveName(type: GraphQLOutputType | GraphQLInputType) {
    if (isListType(type) || isNonNullType(type)) {
      return resolveName(type.ofType);
    }

    return type.name;
  }

  function shouldCollect(name: string): boolean {
    if (!reachableTypes.has(name)) {
      reachableTypes.add(name);
      return true;
    }

    return false;
  }
}
