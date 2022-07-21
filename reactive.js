const targetMap = new WeakMap()

const track = (target, key) => {
    // 从targetMap中找到对象的Map
    let depsMap = targetMap.get(target)
    if (!depsMap)
        targetMap.set(target, depsMap = new Map())

    // 从对象中找到key的Set
    let dep = depsMap.get(key)
    if (!dep)
        depsMap.set(key, dep = new Set())

    // 增加副作用
    dep.add(effect)
}

const trigger = (target, key) => {
    // 从targetMap中找到对象的Map
    const depsMap = targetMap.get(target)
    if (!depsMap) return

    // 从对象中找到key的Set
    const dep = depsMap.get(key)
    if (dep)
        dep.forEach(effect => effect()) // 执行副作用
}
//reactive中使用了proxy去代理对象
const reactive = (target) => {
    return new Proxy(
        target, // 被代理的对象
        // handle 处理程序
        {
            //target：被代理的对象  key: 读取的属性
            get (target, key, receiver) {
                console.log('Get was called with key = ' + key)
                const result = Reflect.get(...arguments)
                track(target, key)
                return result
            },
            set (target, key, value, receiver) {
                console.log('Set was called with key = ' + key)
                let oldValue = target[key]
                Reflect.set(...arguments)
                if (oldValue !== value)
                    trigger(target, key)
                return value
            }
        })
}
// 将{ price: 10, quantity: 2 } 变成响应式
let product = reactive({ price: 5, quantity: 2 });
let total=0
//用effect存储计算总数这段代码
let effect = () => { total = product.price * product.quantity }
//执行一下effect，在这个时候我们读取了product.price,调用get,与此同时会执行track(product,'price')
//然后就会根据目标图去层层嵌套，在product中创建一个新的map,它的值就是depsMap，
//然后再这个结构中，又会创建一个deps里面存放着effect
//同时也会读取product.quantity，过程与price类似
effect();
//然后此时得到的total是10
console.log(total);
//修改quantity值，调用了set，在其中调用了trigger(product,'quantity')
//而trigger()就是去调用一层一层的找，最后找到dep，执行里面的effect,得到最新的total
product.quantity = 5;
//然后此时得到的total就是25
console.log(total);