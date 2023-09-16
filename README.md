# Redux to Yjs Demo

This application demonstrates how to sync deep immutable objects to YJS.

It has the following requirements:

1. Make only the necessary changes.
2. Keep redux instances intact if nothing has been changed.
3. Support custom domain object classes.
4. Support custom collections.
5. Support custom value types (e.g. Color, Vector and so on).

We differentiate between 4 types of values and handle them differently.

### Custom classes

Custom classes must have an `__typeName` property. This property is used similar to reflection in other programming languages to preserve the type information. When such an object is found we try to find the type resolver that converts the object to a serialize format and deserializes to the original type. These classes must also provide the `__instanceId` property to distinguish whether a value has been updated by redux or replaced by a new entity. Depending on this behavior we either update the changed properties or create a new yjs type.

For testing purposed we ported several classes from another project:

* `ImmutableObject` as base class for all entities.
* `ImmutableMap`
* `ImmutableList`
* `ImmutableSet`

### Value types

Value types (for example something like Color, Matrix, Vector) are usually immutable and never updated. Therefore we do not create a yjs type for them because updates are always atomic. Value types are usually custom classes that also have an `__typeName` property, but have a registered value resolver, that converts from and to object.

### Array and objects

Depending on the options, we also convert array and objects to either `Y.Array` or `Y.Map`. We do not make identity changes and just make an update of the yjs type if the old and the new value are bother either array or objects.

### Primitives

Primitives like string and number are handled by yjs, so there is nothing to do from our side.

## Sync from Redux to YJS

To synchronize from redux to yjs we compare the current and the previous state and compare the value. Because of the immutable nature of redux you can usually skip large parts of the state tree, that have not been changed. Then we basically do one of the following operations:

* Set a map value.
* Remove an map key.
* Push an item to an array.
* Remove an item from an array.
* Create new yjs structures when new state is created.

Whenever we create a yjs we also define where this object. We create a bidirectional mappign with the following properties.

* `yjs[__source] = state` to define the synchronization source from a yjs type. We can use that to resolve the state object from a yjs instance.
* `state[__target] = yjs` to define the synchronization yjs type for a state object. We can use that to resolve the yjs type from a state object.

## Sync from YJS
 
We use the events from synchronize from yjs to states. Because of the immutable nature of redux, we always have to update all parents if we update one of the ancestores. Therefore we use the following flow:

* From and event target (the yjs type) we resolve the source state object.
* We mark the state object as **invalid** and attach the event to the state object.
* We loop to the root object using the `parent` property of the yjs type to also navigate to the state root and also mark all items as invalid, that need to be changed.

Lets assume we have the following state and that we receive and update for the paragraph. This would create the following metadata.

```
root [__invalid: true]
   pages [__invalid: true]
      page [__invalid: true]
         paragraphs [__invalid: true]
            paragraph [__invalid: true, event]
      page
         paragraphs
            paragraph
   images
      image
```

Now we have to loop from root to the children and update all state objects using a depth first search.