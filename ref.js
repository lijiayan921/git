const targetMap = new WeakMap()
//我们希望只在effect里调用追踪函数，所以在这引入一个变量
//正在运行中的effect
let activeEffect = []

const effect = (eff) => {
    //将当前的eff入栈
    activeEffect.push(eff)
    //执行
    eff()
    //出栈
    activeEffect.pop()
}

const track = (target, key) => {
    if (activeEffect[activeEffect.length - 1]) { // 判断当前是否有 activeEffect
        // 从targetMap中找到对象的Map
        let depsMap = targetMap.get(target)
        if (!depsMap)
            targetMap.set(target, depsMap = new Map())

        // 从对象中找到key的Set
        let dep = depsMap.get(key)
        if (!dep)
            depsMap.set(key, dep = new Set())

        dep.add(activeEffect[activeEffect.length - 1]) // 增加副作用
      
    }
}

const trigger = (target, key) => {
    // 从targetMap中找到对象的Map
    const depsMap = targetMap.get(target)
    if (!depsMap) return

    // 从对象中找到key的Set
    const dep = depsMap.get(key)
    if (!dep) return
    // 执行副作用
    dep.forEach(inner => effect(inner))
}

const reactive = (target) => {
    return new Proxy(
        target, // 被代理的对象
        // handle 处理程序
        {
            get (target, key, receiver) {
                const result = Reflect.get(...arguments)
                track(target, key)
                return result
            },
            set (target, key, value, receiver) {
                let oldValue = target[key]
                Reflect.set(...arguments)
                trigger(target, key)
                return value
            }
        })
}
//通过对象访问器实现(计算属性),但这里的计算属性不是vue中的计算属性
//对象访问器是一个获取或设置值的函数
const ref = raw => {
    //定义一个对象，他有一个名为value的getter和setter
    const r = {
        get value () {
            //读取值的时候，追踪我们正在创建的对象r
            track(r, 'value');
            return raw;
        },

        set value (newVal) {
            raw = newVal;
            trigger(r, 'value');
        }
    }
    return r;
}

let product = reactive({ price: 10, quantity: 2 });
let total = 0, salePrice = ref(0);
//当我们根据销售价格计算总数时，我们就需要让salePrice变成响应式数据，让一个值变成响应式数据，vue中使用ref
//使用ref返回的响应式数据要通过.value来获取
effect(() => total = salePrice.value * product.quantity);
effect(() => salePrice.value = product.price * 0.9);
console.log(total, salePrice.value); // 18 9
//当我们修改了quantity时，调用set，在里面执行了trigger，执行了total的那个effect函数，得到了最新的total
product.quantity = 5;
console.log(total, salePrice.value); // 45 9
//当我们修改了price时，调用set，在里面执行了trigger,salePrice更新了，
//salePrice.value他是ref返回的响应那个是对象,会调用里面的set,然后执行trigger,最后更新total
product.price = 20;
console.log(total, salePrice.value); // 90 18