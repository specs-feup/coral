#include <stdlib.h>

typedef void (*callback_t)(void);
void register_event(callback_t cb);

int* event_data = 0;

void my_callback() {
    event_data = 0;
}

int main() {
    int val = 100;
    event_data = &val;

    if (event_data != 0) {
        register_event(my_callback);
        // ERR
        int x = *event_data;
    }
    return 0;
}