# Redux to Yjs Demo

This application demonstrates how to sync deep immutable objects to YJS.

It makes the following assumptions:

1. Two objects are the same, when the instance ID (`__instanceId`) property has the same value. This is used to distinguish between updates of an object and a complete replacement. When an object is replaced a new `Y.Map` is created. Otherwise the existing map is updated.
2. The redux state is built in a class based approach. This is inherited from an existing project but does not limit the general approach. We use the following classes: 

   * `ImmutableObject` as base class for all entities.
   * `ImmutableMap`
   * `ImmutableList`
   * `ImmutableSet`

   We assume that whenever one of these classes is used, we want to create an new yjs structure (either `Y.Map` or `Y.Array`). Therefore when you just use an array or object as a property value it is handled as atomic value. This potentially reduces the complexity or the yjs structure.

3. We also have classes in our state, for example special structures like `Vector` or `Transformation` are used in one of my project. To serialize them we support a `toJS` function and factories.

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